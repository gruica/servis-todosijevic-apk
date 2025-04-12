/**
 * Skripta za proveru i popravku podataka o servisima
 * 
 * Problem: Stranica servisa prikazuje se i zatim postaje bela (white screen)
 * Mogući uzrok: Nevalidni podaci u bazi koji izazivaju grešku pri renderovanju
 */

import { db } from "./db";
import { services, clients, appliances, applianceCategories, technicians } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Glavna funkcija za proveru i popravku podataka o servisima
 */
export async function fixServicesData() {
  console.log("⏳ Provera i popravka podataka o servisima...");
  
  try {
    // 1. Dohvati sve servise
    const allServices = await db.select().from(services);
    console.log(`Ukupno servisa u bazi: ${allServices.length}`);

    // 2. Dohvati sva potrebna povezana stanja
    const allClients = await db.select().from(clients);
    const allAppliances = await db.select().from(appliances);
    const allCategories = await db.select().from(applianceCategories);
    const allTechnicians = await db.select().from(technicians);

    // Napravi mape za brže pretraživanje
    const clientsMap = new Map(allClients.map(c => [c.id, c]));
    const appliancesMap = new Map(allAppliances.map(a => [a.id, a]));
    const categoriesMap = new Map(allCategories.map(c => [c.id, c]));
    const techniciansMap = new Map(allTechnicians.map(t => [t.id, t]));

    // 3. Pronađi servise sa potencijalno problematičnim podacima
    const problematicServices = [];
    const missingReferences = [];
    
    for (const service of allServices) {
      // Provera da li nedostaju ključne reference
      if (!clientsMap.has(service.clientId)) {
        missingReferences.push({ serviceId: service.id, issue: `Klijent sa ID ${service.clientId} ne postoji` });
      }
      
      if (!appliancesMap.has(service.applianceId)) {
        missingReferences.push({ serviceId: service.id, issue: `Uređaj sa ID ${service.applianceId} ne postoji` });
      }
      
      // Provera tehničara samo ako je dodeljen (može biti null)
      if (service.technicianId && !techniciansMap.has(service.technicianId)) {
        missingReferences.push({ serviceId: service.id, issue: `Tehničar sa ID ${service.technicianId} ne postoji` });
      }
      
      // Ako uređaj postoji, proveri da li kategorija postoji
      const appliance = appliancesMap.get(service.applianceId);
      if (appliance && !categoriesMap.has(appliance.categoryId)) {
        missingReferences.push({ 
          serviceId: service.id, 
          issue: `Kategorija sa ID ${appliance.categoryId} za uređaj ${service.applianceId} ne postoji` 
        });
      }
      
      // Provera problematičnog opisa - neki karakteri ili dužina mogu izazvati probleme
      if (service.description && (
          service.description.length > 1000 || // previše dugačak opis
          service.description.includes('\0') || // null karakteri
          /[\uD800-\uDFFF]/.test(service.description) // oštećeni unicode
        )) {
        problematicServices.push({ serviceId: service.id, issue: "Problematičan opis" });
      }
    }
    
    // 4. Ispiši rezultate provere
    console.log(`\nPronađeno ${missingReferences.length} servisa sa nedostajućim referencama:`);
    if (missingReferences.length > 0) {
      missingReferences.forEach(ref => {
        console.log(`Servis #${ref.serviceId}: ${ref.issue}`);
      });
    } else {
      console.log("Nema nedostajućih referenci. ✅");
    }
    
    console.log(`\nPronađeno ${problematicServices.length} servisa sa problematičnim podacima:`);
    if (problematicServices.length > 0) {
      problematicServices.forEach(service => {
        console.log(`Servis #${service.serviceId}: ${service.issue}`);
      });
    } else {
      console.log("Nema problematičnih podataka. ✅");
    }

    // 5. Popravi problematične servise
    if (missingReferences.length > 0 || problematicServices.length > 0) {
      console.log("\n🛠️ Popravljanje problematičnih servisa...");
      
      for (const ref of missingReferences) {
        const service = allServices.find(s => s.id === ref.serviceId);
        if (!service) continue;
        
        // Popravka servisa na osnovu tipa problema
        if (ref.issue.includes("Klijent")) {
          // Ako klijent ne postoji, napravimo generički "nepoznati klijent" i ažuriramo servis
          if (allClients.length > 0) {
            // Koristimo postojećeg klijenta kao fallback
            await db.update(services)
              .set({ clientId: allClients[0].id })
              .where(eq(services.id, service.id));
            console.log(`Servis #${service.id}: Klijent postavljen na fallback ID ${allClients[0].id}`);
          }
        }
        
        if (ref.issue.includes("Uređaj")) {
          // Ako uređaj ne postoji i imamo klijenta, kreirajmo generički uređaj za tog klijenta
          const validClientId = clientsMap.has(service.clientId) ? service.clientId : 
                               (allClients.length > 0 ? allClients[0].id : null);
          
          if (validClientId && allCategories.length > 0) {
            // Kreiraj generički uređaj i ažuriraj servis
            const [newAppliance] = await db.insert(appliances)
              .values({
                clientId: validClientId,
                categoryId: allCategories[0].id,
                model: "Nepoznat model",
                serialNumber: `Auto-${Date.now()}`
              })
              .returning();
              
            await db.update(services)
              .set({ applianceId: newAppliance.id })
              .where(eq(services.id, service.id));
            
            console.log(`Servis #${service.id}: Kreiran zamjenski uređaj ID ${newAppliance.id}`);
          }
        }
        
        if (ref.issue.includes("Tehničar")) {
          // Ako tehničar ne postoji, postavimo na null (nema dodeljenog tehničara)
          await db.update(services)
            .set({ technicianId: null })
            .where(eq(services.id, service.id));
          console.log(`Servis #${service.id}: Uklonjen nepostojeći tehničar`);
        }
      }
      
      // Popravi problematične opise
      for (const problem of problematicServices) {
        const service = allServices.find(s => s.id === problem.serviceId);
        if (!service) continue;
        
        if (problem.issue === "Problematičan opis") {
          // Skraćujemo i čistimo opis
          let cleanedDescription = service.description || "";
          
          // Ograniči dužinu
          if (cleanedDescription.length > 500) {
            cleanedDescription = cleanedDescription.substring(0, 500) + "...";
          }
          
          // Ukloni problematične karaktere
          cleanedDescription = cleanedDescription
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF]/g, "")
            .replace(/\\u[0-9a-fA-F]{4}/g, "");
          
          await db.update(services)
            .set({ description: cleanedDescription })
            .where(eq(services.id, service.id));
          console.log(`Servis #${service.id}: Očišćen problematičan opis`);
        }
      }
      
      console.log("\n✅ Popravka servisa završena.");
    } else {
      console.log("\n✅ Nisu potrebne popravke. Svi podaci su ispravni.");
    }
  } catch (error) {
    console.error("❌ Greška prilikom popravke podataka:", error);
  }
}

// Pokreni funkciju ako je skript pokrenut direktno 
// U ESM okruženju koristimo direktno pozivanje
fixServicesData().finally(() => process.exit(0));