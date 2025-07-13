/**
 * Skripta za proveru i ispravku uloga korisnika u bazi podataka
 * Proverava da li su uloge pravilno postavljene i ispravlja greške
 */

import { db } from "../server/db.js";
import { users } from "../shared/schema.js";
import { eq, sql } from "drizzle-orm";

async function checkAndFixUserRoles() {
  console.log("\n=== PROVERA I ISPRAVKA ULOGA KORISNIKA ===");
  
  try {
    // 1. Dohvati sve korisnike
    const allUsers = await db.select().from(users).orderBy(users.id);
    
    console.log(`\nUkupno korisnika u bazi: ${allUsers.length}`);
    console.log("\nTrenutno stanje korisnika:");
    console.log("--------------------------------------");
    
    for (const user of allUsers) {
      console.log(`ID: ${user.id}`);
      console.log(`Ime: ${user.fullName}`);
      console.log(`Email: ${user.username}`);
      console.log(`Uloga: ${user.role}`);
      console.log(`TechnicianId: ${user.technicianId || 'null'}`);
      console.log("--------------------------------------");
    }
    
    // 2. Proveri da li Jelena ima ispravnu ulogu
    const jelena = allUsers.find(u => u.fullName.toLowerCase().includes('jelena'));
    if (jelena && jelena.role !== 'administrator') {
      console.log(`\n⚠️  PRONAĐEN PROBLEM: ${jelena.fullName} ima ulogu "${jelena.role}" umesto "administrator"`);
      console.log("Ispravka uloge...");
      
      await db.update(users)
        .set({ role: 'administrator' })
        .where(eq(users.id, jelena.id));
        
      console.log(`✅ Uloga za ${jelena.fullName} ispravljena na "administrator"`);
    }
    
    // 3. Proveri distribuciju uloga
    console.log("\n=== STATISTIKA ULOGA ===");
    const roleStats = await db.select({
      role: users.role,
      count: sql<number>`count(*)::int`
    })
    .from(users)
    .groupBy(users.role);
    
    for (const stat of roleStats) {
      console.log(`${stat.role}: ${stat.count} korisnika`);
    }
    
    // 4. Proveri da li postoje neispravne uloge (stare verzije)
    const invalidRoles = allUsers.filter(u => 
      !['administrator', 'serviser', 'klijent', 'poslovni_partner'].includes(u.role)
    );
    
    if (invalidRoles.length > 0) {
      console.log(`\n⚠️  Pronađeno ${invalidRoles.length} korisnika sa neispravnim ulogama:`);
      for (const user of invalidRoles) {
        console.log(`- ${user.fullName} (${user.username}): "${user.role}"`);
        
        // Pokušaj automatske ispravke
        let newRole = user.role;
        if (user.role === 'admin') newRole = 'administrator';
        else if (user.role === 'technician') newRole = 'serviser';
        else if (user.role === 'customer') newRole = 'klijent';
        else if (user.role === 'business_partner') newRole = 'poslovni_partner';
        
        if (newRole !== user.role) {
          console.log(`  Ispravka: "${user.role}" → "${newRole}"`);
          await db.update(users)
            .set({ role: newRole })
            .where(eq(users.id, user.id));
        }
      }
      console.log("✅ Sve neispravne uloge su ispravljene");
    }
    
    // 5. Finalna provera
    console.log("\n=== FINALNO STANJE ===");
    const finalUsers = await db.select().from(users).orderBy(users.id);
    
    for (const user of finalUsers) {
      console.log(`${user.fullName} (${user.username}): ${user.role}`);
    }
    
    console.log("\n✅ Provera i ispravka uloga završena!");
    
  } catch (error) {
    console.error("❌ Greška pri proveri uloga:", error);
  } finally {
    process.exit(0);
  }
}

// Pokreni skriptu
checkAndFixUserRoles();