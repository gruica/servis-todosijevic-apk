/**
 * Skripta za čišćenje baze podataka - brisanje svih testnih klijenata i servisa
 * Zadržava samo validne klijente sa stvarnim servisnim aktivnostima
 */

import { db } from "../server/db";
import { clients, services, appliances } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

interface CleanupStats {
  deletedClients: number;
  deletedServices: number;
  deletedAppliances: number;
  validClientsRemaining: number;
  validServicesRemaining: number;
}

async function cleanDatabase(): Promise<CleanupStats> {
  console.log("🧹 Početak čišćenja baze podataka...");
  
  // Lista ID-jeva klijenata za brisanje
  const clientsToDelete = [
    // Testni klijenti
    278, 279, 280, 281, 272, 273, 277,
    // Duplikati bez servisa
    256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 274, 275, 276,
    // Klijenti bez servisa
    1, 12, 18, 20, 22, 244, 255
  ];

  let stats: CleanupStats = {
    deletedClients: 0,
    deletedServices: 0,
    deletedAppliances: 0,
    validClientsRemaining: 0,
    validServicesRemaining: 0
  };

  try {
    // 1. Prvo obrišemo servise povezane sa testnim klijentima
    console.log("🗑️  Brisanje servisa testnih klijenata...");
    const servicesToDelete = await db
      .select({ id: services.id })
      .from(services)
      .where(inArray(services.clientId, clientsToDelete));
    
    console.log(`Pronađeno ${servicesToDelete.length} servisa za brisanje`);
    
    if (servicesToDelete.length > 0) {
      const serviceIds = servicesToDelete.map(s => s.id);
      const deletedServices = await db
        .delete(services)
        .where(inArray(services.id, serviceIds));
      
      stats.deletedServices = servicesToDelete.length;
      console.log(`✅ Obrisano ${stats.deletedServices} servisa`);
    }

    // 2. Obrišemo uređaje povezane sa testnim klijentima
    console.log("🗑️  Brisanje uređaja testnih klijenata...");
    const appliancesToDelete = await db
      .select({ id: appliances.id })
      .from(appliances)
      .where(inArray(appliances.clientId, clientsToDelete));
    
    console.log(`Pronađeno ${appliancesToDelete.length} uređaja za brisanje`);
    
    if (appliancesToDelete.length > 0) {
      const applianceIds = appliancesToDelete.map(a => a.id);
      const deletedAppliances = await db
        .delete(appliances)
        .where(inArray(appliances.id, applianceIds));
      
      stats.deletedAppliances = appliancesToDelete.length;
      console.log(`✅ Obrisano ${stats.deletedAppliances} uređaja`);
    }

    // 3. Konačno obrišemo testne klijente
    console.log("🗑️  Brisanje testnih klijenata...");
    const deletedClients = await db
      .delete(clients)
      .where(inArray(clients.id, clientsToDelete));
    
    stats.deletedClients = clientsToDelete.length;
    console.log(`✅ Obrisano ${stats.deletedClients} klijenata`);

    // 4. Proveravamo šta je ostalo
    console.log("📊 Provera finalnog stanja baze...");
    
    const remainingClients = await db
      .select()
      .from(clients);
    
    const remainingServices = await db
      .select()
      .from(services);
    
    stats.validClientsRemaining = remainingClients.length;
    stats.validServicesRemaining = remainingServices.length;

    console.log("\n🎉 Čišćenje baze podataka završeno!");
    console.log("📈 Statistike:");
    console.log(`   - Obrisano klijenata: ${stats.deletedClients}`);
    console.log(`   - Obrisano servisa: ${stats.deletedServices}`);
    console.log(`   - Obrisano uređaja: ${stats.deletedAppliances}`);
    console.log(`   - Preostalo validnih klijenata: ${stats.validClientsRemaining}`);
    console.log(`   - Preostalo validnih servisa: ${stats.validServicesRemaining}`);

    return stats;

  } catch (error) {
    console.error("❌ Greška pri čišćenju baze podataka:", error);
    throw error;
  }
}

// Pokretanje skripte
cleanDatabase()
  .then((stats) => {
    console.log("\n✅ Baza podataka je uspešno očišćena!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Neuspešno čišćenje baze podataka:", error);
    process.exit(1);
  });