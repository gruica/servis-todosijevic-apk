/**
 * Skripta za debagovanje servisa i obaveznih pridruženih podataka sa detaljnim prikazom
 * Proverava servisi tabelu i pridružene podatke iz drugih tabela
 */

import { db } from "../server/db";
import { services, clients, appliances, applianceCategories, technicians } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function debugServicesPage() {
  try {
    console.log("Detaljna analiza servisa i pridruženih podataka za debagovanje stranice servisa...");
    
    // 1. Dohvati sve servise
    const allServices = await db.select().from(services).limit(5); // Limitiramo na 5 za čitljivost
    
    // 2. Za svaki servis, dohvati sve podatke koji se koriste na stranici
    const serviceDetails = [];
    
    for (const service of allServices) {
      // Dohvati klijenta
      const [client] = await db.select().from(clients).where(eq(clients.id, service.clientId));
      
      // Dohvati uređaj
      const [appliance] = await db.select().from(appliances).where(eq(appliances.id, service.applianceId));
      
      // Dohvati kategoriju uređaja
      let category = null;
      if (appliance) {
        [category] = await db.select().from(applianceCategories).where(eq(applianceCategories.id, appliance.categoryId));
      }
      
      // Dohvati tehnićara
      let technician = null;
      if (service.technicianId) {
        [technician] = await db.select().from(technicians).where(eq(technicians.id, service.technicianId));
      }
      
      // Dodaj podatke za analizu
      serviceDetails.push({
        service: {
          id: service.id,
          status: service.status,
          description: service.description,
          clientId: service.clientId,
          applianceId: service.applianceId,
          technicianId: service.technicianId,
          createdAt: service.createdAt,
        },
        client: client ? {
          id: client.id,
          fullName: client.fullName,
          phone: client.phone,
        } : null,
        appliance: appliance ? {
          id: appliance.id,
          model: appliance.model,
          serialNumber: appliance.serialNumber,
          categoryId: appliance.categoryId,
        } : null,
        category: category ? {
          id: category.id,
          name: category.name,
          icon: category.icon,
        } : null,
        technician: technician ? {
          id: technician.id,
          fullName: technician.fullName,
        } : null
      });
    }
    
    // 3. Ispiši sve podatke za debagovanje
    console.log("\n===== DETALJNI PODACI ZA DEBAGOVANJE SERVISI STRANICE =====\n");
    
    serviceDetails.forEach((detail, index) => {
      console.log(`\n--- Servis #${index + 1} (ID: ${detail.service.id}) ---`);
      
      console.log("Servis:", JSON.stringify(detail.service, null, 2));
      
      console.log("\nKlijent:", detail.client 
        ? JSON.stringify(detail.client, null, 2) 
        : "Nema povezanog klijenta");
      
      console.log("\nUređaj:", detail.appliance 
        ? JSON.stringify(detail.appliance, null, 2) 
        : "Nema povezanog uređaja");
      
      console.log("\nKategorija:", detail.category 
        ? JSON.stringify(detail.category, null, 2) 
        : "Nema povezane kategorije");
      
      console.log("\nTehničar:", detail.technician 
        ? JSON.stringify(detail.technician, null, 2) 
        : "Nema dodeljenog tehničara");
      
      console.log("\nAnaliza za prikaz na stranici:");
      
      console.log(`- Ime za prikaz: ${detail.client?.fullName || "NEDOSTAJE"}`);
      console.log(`- Inicijali za avatar: ${detail.client?.fullName ? getUserInitials(detail.client.fullName) : "NEDOSTAJE"}`);
      console.log(`- Naziv uređaja za prikaz: ${detail.category?.name || "NEDOSTAJE"}`);
      console.log(`- Ikona za prikaz: ${detail.category?.icon || "NEDOSTAJE"}`);
      console.log(`- Status za prikaz: ${detail.service.status || "NEDOSTAJE"}`);
      
      console.log("------------------------------------------");
    });
    
    // 4. Ispitaj da li postoje servisi sa kategorijama koje nemaju ikonu ili naziv
    const servicesWithoutCategoryData = await db.select({
      serviceId: services.id,
      applianceId: services.applianceId,
      categoryId: appliances.categoryId,
      categoryName: applianceCategories.name,
      categoryIcon: applianceCategories.icon
    })
    .from(services)
    .leftJoin(appliances, eq(services.applianceId, appliances.id))
    .leftJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
    .where(
      sql`${applianceCategories.name} IS NULL OR ${applianceCategories.icon} IS NULL`
    );
    
    if (servicesWithoutCategoryData.length > 0) {
      console.log(`\n\nPAŽNJA: Pronađeno ${servicesWithoutCategoryData.length} servisa sa nepostojećom kategorijom ili nedostajućim podacima o kategoriji:`);
      
      servicesWithoutCategoryData.forEach(item => {
        console.log(`- Servis ID: ${item.serviceId}, Uređaj ID: ${item.applianceId}, Kategorija ID: ${item.categoryId || "null"}`);
        console.log(`  Naziv kategorije: ${item.categoryName || "NEDOSTAJE"}, Ikona: ${item.categoryIcon || "NEDOSTAJE"}`);
      });
    } else {
      console.log("\n\nDobro: Svi servisi imaju uređaje sa validnim kategorijama (naziv i ikona).");
    }
    
    return {
      totalServicesAnalyzed: allServices.length,
      servicesWithoutCategoryData: servicesWithoutCategoryData.length
    };
  } catch (error) {
    console.error("Greška prilikom debagovanja servisa:", error);
    throw error;
  }
}

// Pomoćna funkcija za inicijale (ista koja se koristi na frontendu)
function getUserInitials(name: string) {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(word => word && word[0] ? word[0].toUpperCase() : '')
    .filter(Boolean)
    .join('');
}

// Pokreni skriptu
debugServicesPage()
  .then(result => {
    console.log("\nRezultat debagovanja:");
    console.log(`- Analizirano servisa: ${result.totalServicesAnalyzed}`);
    console.log(`- Servisa sa nedostajućim podacima o kategoriji: ${result.servicesWithoutCategoryData}`);
    process.exit(0);
  })
  .catch(error => {
    console.error("Neočekivana greška:", error);
    process.exit(1);
  });