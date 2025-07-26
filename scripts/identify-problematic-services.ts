/**
 * Skripta za identifikaciju problematičnih servisa koji uzrokuju bijeli ekran
 * na stranici servisa. Analiza se vrši testiranjem svakog servisa zasebno
 * i validacijom integriteta referenci i podataka.
 */
import { db } from "../server/db";
import { sql, eq } from "drizzle-orm";
import { services, clients, appliances, applianceCategories, manufacturers, technicians, users } from "../shared/schema";

// Interfejs za problematičan servis
interface ProblematicService {
  id: number;
  cause: string;
  details: any;
  severity: 'critical' | 'warning' | 'info';
}

async function identifyProblematicServices() {
  try {
    console.log("Započinjem detaljnu analizu servisa...");
    
    const problematicServices: ProblematicService[] = [];
    
    // Prvo dohvatamo sve servise
    const allServices = await db
      .select()
      .from(services)
      .orderBy(sql`${services.id} DESC`);
    console.log(`Pronađeno ukupno ${allServices.length} servisa.\n`);
    
    // Analiza svakog servisa
    console.log("Detaljna analiza problematičnih servisa:");
    console.log("-----------------------------------------");
    
    for (const service of allServices) {
      let issues: string[] = [];
      
      // 1. Provjera integriteta klijenta
      const clientResult = await db
        .select()
        .from(clients)
        .where(eq(clients.id, service.clientId));
      
      if (clientResult.length === 0) {
        issues.push(`Nepostojeći klijent (ID: ${service.clientId})`);
      } else {
        const client = clientResult[0];
        if (!client.fullName) {
          issues.push(`Klijent bez imena (ID: ${client.id})`);
        }
        if (!client.phone) {
          issues.push(`Klijent bez telefona (ID: ${client.id})`);
        }
      }
      
      // 2. Provjera integriteta uređaja
      const applianceResult = await db
        .select({
          id: appliances.id,
          categoryId: appliances.categoryId,
          manufacturerId: appliances.manufacturerId,
          model: appliances.model,
          serialNumber: appliances.serialNumber,
          categoryName: applianceCategories.name,
          manufacturerName: manufacturers.name,
        })
        .from(appliances)
        .leftJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
        .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .where(eq(appliances.id, service.applianceId));
      
      if (applianceResult.length === 0) {
        issues.push(`Nepostojeći uređaj (ID: ${service.applianceId})`);
      } else {
        const appliance = applianceResult[0];
        if (!appliance.categoryName) {
          issues.push(`Uređaj bez kategorije ili sa nepostojećom kategorijom (ID: ${appliance.id})`);
        }
        if (!appliance.manufacturerName) {
          issues.push(`Uređaj bez proizvođača ili sa nepostojećim proizvođačem (ID: ${appliance.id})`);
        }
      }
      
      // 3. Provjera tehničara (ako je dodeljen)
      if (service.technicianId) {
        const technicianResult = await db
          .select()
          .from(technicians)
          .where(eq(technicians.id, service.technicianId));
        
        if (technicianResult.length === 0) {
          issues.push(`Nepostojeći serviser (ID: ${service.technicianId})`);
        }
      }
      
      // 4. Provjera poslovnog partnera (ako postoji)
      if (service.businessPartnerId) {
        const partnerResult = await db
          .select()
          .from(users)
          .where(sql`${users.id} = ${service.businessPartnerId} AND ${users.role} = 'business'`);
        
        if (partnerResult.length === 0) {
          issues.push(`Nepostojeći poslovni partner (ID: ${service.businessPartnerId})`);
        }
      }
      
      // 5. Provjera za JSON podatke koji mogu uzrokovati probleme
      try {
        if (service.usedParts) JSON.parse(service.usedParts);
      } catch (e) {
        issues.push(`Nevalidan JSON u used_parts (${service.usedParts})`);
      }
      
      // 6. Provjera za neuobičajeno dugačke tekstualne vrijednosti
      const textFieldChecks = [
        { field: 'description', value: service.description },
        { field: 'technician_notes', value: service.technicianNotes },
        { field: 'machine_notes', value: service.machineNotes }
      ];
      for (const { field, value } of textFieldChecks) {
        if (value && value.length > 2000) {
          issues.push(`Neuobičajeno dugačak tekst u polju "${field}" (${value.length} karaktera)`);
        }
      }
      
      // 7. Provjera NULL vrijednosti u ne-nullable poljima
      const requiredFieldChecks = [
        { field: 'description', value: service.description },
        { field: 'status', value: service.status },
        { field: 'created_at', value: service.createdAt }
      ];
      for (const { field, value } of requiredFieldChecks) {
        if (value === null || value === undefined) {
          issues.push(`Nedostaje obavezno polje "${field}"`);
        }
      }
  
      // Ako ima problema, dodaj u listu problematičnih servisa
      if (issues.length > 0) {
        const severity = issues.some(i => 
          i.includes('Nepostojeći') || 
          i.includes('Nedostaje obavezno') || 
          i.includes('Nevalidan JSON')
        ) ? 'critical' : 'warning';
        
        problematicServices.push({
          id: service.id,
          cause: issues.join('; '),
          details: {
            clientId: service.clientId,
            applianceId: service.applianceId,
            description: service.description?.substring(0, 100) + (service.description?.length > 100 ? '...' : ''),
            status: service.status,
            createdAt: service.createdAt
          },
          severity
        });
      }
    }
    
    // Sortiramo prvo po težini problema, zatim po ID-u
    problematicServices.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return b.id - a.id;
    });
    
    console.log(`Ukupno pronađeno ${problematicServices.length} problematičnih servisa.`);
    console.log('\nDetaljan prikaz problematičnih servisa:');
    console.log('=========================================');
    
    problematicServices.forEach((service, index) => {
      console.log(`\n#${index + 1} - SERVIS ID: ${service.id} [${service.severity.toUpperCase()}]`);
      console.log(`Status: ${service.details.status}`);
      console.log(`Datum: ${service.details.createdAt}`);
      console.log(`Opis: ${service.details.description}`);
      console.log(`Problemi: ${service.cause}`);
      console.log('----------------------------------------');
    });
    
    // Pronalaženje servisa koji su najvjerovatnije uzrok problema
    const criticalServices = problematicServices.filter(s => s.severity === 'critical');
    
    console.log('\n==========================================');
    console.log('ZAKLJUČAK:');
    console.log('==========================================');
    console.log(`Pronađeno ${criticalServices.length} kritičnih servisa koji vrlo vjerovatno uzrokuju bijeli ekran.`);
    
    if (criticalServices.length > 0) {
      console.log('\nEvo liste servisa koje hitno treba popraviti:');
      criticalServices.forEach((service, index) => {
        console.log(`${index + 1}. Servis ID: ${service.id} - ${service.cause}`);
      });
      
      // Predlog SQL naredbi za popravku
      console.log('\n==========================================');
      console.log('PREDLOŽENE SQL NAREDBE ZA POPRAVKU:');
      console.log('==========================================');
      
      criticalServices.forEach(service => {
        if (service.cause.includes('Nepostojeći klijent')) {
          console.log(`-- Za servis ID ${service.id} (nepostojeći klijent):`);
          console.log(`-- Opcija 1: Obriši servis`);
          console.log(`DELETE FROM services WHERE id = ${service.id};`);
          console.log(`-- Opcija 2: Dodeli validnog klijenta`);
          console.log(`UPDATE services SET client_id = [ID_VALIDNOG_KLIJENTA] WHERE id = ${service.id};`);
          console.log();
        }
        else if (service.cause.includes('Nepostojeći uređaj')) {
          console.log(`-- Za servis ID ${service.id} (nepostojeći uređaj):`);
          console.log(`-- Opcija 1: Obriši servis`);
          console.log(`DELETE FROM services WHERE id = ${service.id};`);
          console.log(`-- Opcija 2: Dodeli validan uređaj`);
          console.log(`UPDATE services SET appliance_id = [ID_VALIDNOG_UREDJAJA] WHERE id = ${service.id};`);
          console.log();
        }
        else if (service.cause.includes('Nevalidan JSON')) {
          console.log(`-- Za servis ID ${service.id} (nevalidan JSON):`);
          console.log(`UPDATE services SET used_parts = '[]' WHERE id = ${service.id};`);
          console.log();
        }
        else if (service.cause.includes('Nedostaje obavezno')) {
          console.log(`-- Za servis ID ${service.id} (nedostaju obavezna polja):`);
          console.log(`-- Popuni nedostajuća polja`);
          if (service.cause.includes('description')) {
            console.log(`UPDATE services SET description = 'Opis nije dostupan' WHERE id = ${service.id} AND (description IS NULL OR description = '');`);
          }
          if (service.cause.includes('status')) {
            console.log(`UPDATE services SET status = 'pending' WHERE id = ${service.id} AND (status IS NULL OR status = '');`);
          }
          if (service.cause.includes('created_at')) {
            console.log(`UPDATE services SET created_at = CURRENT_DATE WHERE id = ${service.id} AND created_at IS NULL;`);
          }
          console.log();
        }
      });
    }
    
  } catch (error) {
    console.error("Greška prilikom analize servisa:", error);
  } finally {
    // Drizzle handles connection pooling automatically
    console.log("Konekcija završena.");
  }
}

// Pokreni funkciju
identifyProblematicServices().then(() => {
  console.log("\nGotovo.");
  process.exit(0);
}).catch(error => {
  console.error("Kritična greška:", error);
  process.exit(1);
});