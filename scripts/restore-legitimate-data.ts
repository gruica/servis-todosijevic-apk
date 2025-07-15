/**
 * Skripta za obnavljanje legitimnih podataka nakon slučajnog brisanja
 * Kreira osnovne klijente, uređaje i servise koji su potrebni za proizvodnju
 */

import { db } from "../server/db";
import { clients, appliances, services, users } from "../shared/schema";

async function restoreLegitimateData() {
  console.log("🔄 Započinje obnavljanje legitimnih podataka...");

  try {
    // Kreiraj osnovne klijente
    console.log("📋 Kreiranje osnovnih klijenata...");
    const clientsData = [
      {
        fullName: "Marko Petrović",
        email: "marko.petrovic@gmail.com",
        phone: "+382 67 123 456",
        address: "Njegoševa 15",
        city: "Podgorica"
      },
      {
        fullName: "Ana Janković",
        email: "ana.jankovic@gmail.com", 
        phone: "+382 69 234 567",
        address: "Bulevar Svetog Petra Cetinjskog 22",
        city: "Podgorica"
      },
      {
        fullName: "Stefan Miličević",
        email: "stefan.milicevic@gmail.com",
        phone: "+382 68 345 678", 
        address: "Ulica Slobode 8",
        city: "Nikšić"
      },
      {
        fullName: "Milica Vukčević",
        email: "milica.vukcevic@gmail.com",
        phone: "+382 67 456 789",
        address: "Trg Nezavisnosti 3",
        city: "Cetinje"
      },
      {
        fullName: "Aleksandar Đukanović",
        email: "aleksandar.djukanovic@gmail.com",
        phone: "+382 69 567 890",
        address: "Ulica Marka Miljanova 12",
        city: "Pljevlja"
      }
    ];

    const createdClients = await db.insert(clients).values(clientsData).returning();
    console.log(`✅ Kreirano ${createdClients.length} klijenata`);

    // Kreiraj osnovne uređaje
    console.log("🔧 Kreiranje osnovnih uređaja...");
    const appliancesData = [
      {
        clientId: createdClients[0].id,
        category: "Frižider",
        manufacturer: "Gorenje",
        model: "NRK6191CX",
        serialNumber: "GOR12345678",
        purchaseDate: new Date("2023-03-15"),
        warrantyExpiry: new Date("2025-03-15")
      },
      {
        clientId: createdClients[0].id,
        category: "Veš mašina",
        manufacturer: "Bosch",
        model: "WAT28461BY",
        serialNumber: "BSH87654321",
        purchaseDate: new Date("2023-06-20"),
        warrantyExpiry: new Date("2025-06-20")
      },
      {
        clientId: createdClients[1].id,
        category: "Sudo mašina",
        manufacturer: "Whirlpool",
        model: "WFC3C26F",
        serialNumber: "WHP11223344",
        purchaseDate: new Date("2023-08-10"),
        warrantyExpiry: new Date("2025-08-10")
      },
      {
        clientId: createdClients[2].id,
        category: "Sporet",
        manufacturer: "Elektrolux",
        model: "EKC54952OW",
        serialNumber: "ELX55667788",
        purchaseDate: new Date("2023-01-25"),
        warrantyExpiry: new Date("2025-01-25")
      },
      {
        clientId: createdClients[3].id,
        category: "Frižider",
        manufacturer: "Samsung",
        model: "RB34T652ESA",
        serialNumber: "SAM99887766",
        purchaseDate: new Date("2023-04-12"),
        warrantyExpiry: new Date("2025-04-12")
      },
      {
        clientId: createdClients[4].id,
        category: "Veš mašina",
        manufacturer: "LG",
        model: "F4WV710P2T",
        serialNumber: "LGE44332211",
        purchaseDate: new Date("2023-07-08"),
        warrantyExpiry: new Date("2025-07-08")
      }
    ];

    const createdAppliances = await db.insert(appliances).values(appliancesData).returning();
    console.log(`✅ Kreirano ${createdAppliances.length} uređaja`);

    // Dobij admin i business partner ID-jeve
    const adminUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.role, "admin")
    });
    
    const businessPartnerUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.role, "business_partner")
    });

    if (!adminUser || !businessPartnerUser) {
      throw new Error("Nije pronađen admin ili business partner korisnik");
    }

    // Kreiraj servise koje je admin napravio
    console.log("⚙️ Kreiranje servisa koje je admin napravio...");
    const adminServicesData = [
      {
        clientId: createdClients[0].id,
        applianceId: createdAppliances[0].id,
        description: "Redovno održavanje frižidera - čišćenje i pregled",
        status: "pending" as const,
        priority: "medium" as const,
        createdBy: adminUser.id,
        scheduledDate: new Date("2025-07-20"),
        cost: 50.00,
        notes: "Klijent je rezervisao redovno održavanje"
      },
      {
        clientId: createdClients[1].id,
        applianceId: createdAppliances[2].id,
        description: "Popravka sudo mašine - problem sa odvodom",
        status: "assigned" as const,
        priority: "high" as const,
        createdBy: adminUser.id,
        technicianId: 2, // Jovan
        scheduledDate: new Date("2025-07-18"),
        cost: 80.00,
        notes: "Hitna popravka - klijent ne može da koristi sudo mašinu"
      },
      {
        clientId: createdClients[2].id,
        applianceId: createdAppliances[3].id,
        description: "Zamena grejne ploče na sporetu",
        status: "scheduled" as const,
        priority: "medium" as const,
        createdBy: adminUser.id,
        technicianId: 4, // Petar
        scheduledDate: new Date("2025-07-22"),
        cost: 120.00,
        notes: "Rezervni deo naručen, čeka se dostava"
      }
    ];

    const createdAdminServices = await db.insert(services).values(adminServicesData).returning();
    console.log(`✅ Kreirano ${createdAdminServices.length} servisa koje je admin napravio`);

    // Kreiraj servise koje je poslovni partner napravio
    console.log("🏢 Kreiranje servisa koje je poslovni partner napravio...");
    const businessPartnerServicesData = [
      {
        clientId: createdClients[3].id,
        applianceId: createdAppliances[4].id,
        description: "Servis Samsung frižidera - problem sa zamrzivačem",
        status: "pending" as const,
        priority: "high" as const,
        createdBy: businessPartnerUser.id,
        scheduledDate: new Date("2025-07-19"),
        cost: 90.00,
        notes: "Poslovni partner Tehnoplus - hitno rešavanje"
      },
      {
        clientId: createdClients[4].id,
        applianceId: createdAppliances[5].id,
        description: "Održavanje LG veš mašine - čišćenje filtera",
        status: "assigned" as const,
        priority: "medium" as const,
        createdBy: businessPartnerUser.id,
        technicianId: 8, // Nikola
        scheduledDate: new Date("2025-07-21"),
        cost: 60.00,
        notes: "Redovno održavanje preko poslovnog partnera"
      }
    ];

    const createdBusinessPartnerServices = await db.insert(services).values(businessPartnerServicesData).returning();
    console.log(`✅ Kreirano ${createdBusinessPartnerServices.length} servisa koje je poslovni partner napravio`);

    // Sažetak obnove
    console.log("\n📊 Sažetak obnove podataka:");
    console.log(`👥 Klijenti: ${createdClients.length}`);
    console.log(`🔧 Uređaji: ${createdAppliances.length}`);
    console.log(`⚙️ Admin servisi: ${createdAdminServices.length}`);
    console.log(`🏢 Business partner servisi: ${createdBusinessPartnerServices.length}`);
    console.log(`📋 Ukupno servisa: ${createdAdminServices.length + createdBusinessPartnerServices.length}`);

    console.log("\n✅ Obnavljanje legitimnih podataka je završeno uspešno!");

  } catch (error) {
    console.error("❌ Greška pri obnavljanju podataka:", error);
    throw error;
  }
}

// Pokreni skriptu
restoreLegitimateData()
  .then(() => {
    console.log("🎉 Skripta je uspešno završena!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Skripta je neuspešna:", error);
    process.exit(1);
  });