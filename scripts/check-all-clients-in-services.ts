/**
 * Skripta za proveru svih klijenata u servisi tabeli
 * Detaljno proverava svaki servis i njegovu vezu sa klijentom
 */
import { db } from "../server/db";
import { services, clients } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

async function checkAllClientsInServices() {
  try {
    console.log("Detaljna provera svih servisa i klijenata...");
    
    // 1. Dohvati sve servise
    const allServices = await db.select({
      id: services.id,
      clientId: services.clientId,
      status: services.status,
      description: services.description,
    }).from(services);
    
    console.log(`Ukupno servisa: ${allServices.length}`);
    
    // 2. Dohvati sve klijente
    const allClients = await db.select({
      id: clients.id,
      fullName: clients.fullName,
      phone: clients.phone,
    }).from(clients);
    
    console.log(`Ukupno klijenata: ${allClients.length}`);
    
    // 3. Kreiramo mapu klijenata za brzu pretragu
    const clientMap = new Map();
    allClients.forEach(client => {
      clientMap.set(client.id, client);
    });
    
    // 4. Provera svakog servisa pojedinačno
    let servicesWithNullClient = 0;
    let servicesWithInvalidClient = 0;
    let servicesWithoutClientName = 0;
    let servicesWithoutClientPhone = 0;
    
    const problematicServices = [];
    
    for (const service of allServices) {
      let issues = [];
      
      if (service.clientId === null) {
        servicesWithNullClient++;
        issues.push("Null klijent ID");
      } else {
        const client = clientMap.get(service.clientId);
        
        if (!client) {
          servicesWithInvalidClient++;
          issues.push("Klijent ne postoji u bazi");
        } else {
          if (!client.fullName) {
            servicesWithoutClientName++;
            issues.push("Klijent nema ime");
          }
          
          if (!client.phone) {
            servicesWithoutClientPhone++;
            issues.push("Klijent nema telefon");
          }
        }
      }
      
      if (issues.length > 0) {
        problematicServices.push({
          serviceId: service.id,
          clientId: service.clientId,
          status: service.status,
          description: service.description,
          issues: issues.join(", ")
        });
      }
    }
    
    // 5. Prikaži rezultate
    if (problematicServices.length > 0) {
      console.log(`\nPronađeno ${problematicServices.length} servisa sa potencijalnim problemima:`);
      
      problematicServices.forEach(service => {
        console.log(`- Servis ID: ${service.serviceId}, Klijent ID: ${service.clientId}, Status: ${service.status}`);
        console.log(`  Problemi: ${service.issues}`);
        console.log(`  Opis: ${service.description}`);
      });
      
      console.log("\nSažetak problema:");
      console.log(`- Servisi bez klijenta: ${servicesWithNullClient}`);
      console.log(`- Servisi sa nepostojećim klijentom: ${servicesWithInvalidClient}`);
      console.log(`- Servisi čiji klijent nema ime: ${servicesWithoutClientName}`);
      console.log(`- Servisi čiji klijent nema telefon: ${servicesWithoutClientPhone}`);
    } else {
      console.log("\nSvi servisi imaju validne veze sa klijentima. Nema problematičnih servisa.");
    }
    
    return {
      totalServices: allServices.length,
      problematicServices: problematicServices.length,
      servicesWithNullClient,
      servicesWithInvalidClient,
      servicesWithoutClientName,
      servicesWithoutClientPhone
    };
    
  } catch (error) {
    console.error("Greška prilikom provere servisa i klijenata:", error);
    throw error;
  }
}

// Pokreni skriptu
checkAllClientsInServices()
  .then(result => {
    console.log("\nRezultat provere:");
    console.log(`- Ukupno servisa: ${result.totalServices}`);
    console.log(`- Problematičnih servisa: ${result.problematicServices}`);
    process.exit(0);
  })
  .catch(error => {
    console.error("Neočekivana greška:", error);
    process.exit(1);
  });