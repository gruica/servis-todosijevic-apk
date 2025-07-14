import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function updateTechnicianAccounts() {
  console.log("Početak ažuriranja naloga servisera...");
  
  const technicians = [
    {
      oldUsername: "petar@servistodosijevic.me",
      newUsername: "petar@frigosistemtodosijevic.com",
      email: "petar@frigosistemtodosijevic.com",
      password: "Petar1.",
      fullName: "Petar Vulović"
    },
    {
      oldUsername: "jovan@servistodosijevic.me", 
      newUsername: "jovan@frigosistemtodosijevic.com",
      email: "jovan@frigosistemtodosijevic.com",
      password: "Jovan1.",
      fullName: "Jovan Todosijević"
    },
    {
      oldUsername: "nikola@servistodosijevic.me",
      newUsername: "nikola@frigosistemtodosijevic.com", 
      email: "nikola@frigosistemtodosijevic.com",
      password: "Nikola1.",
      fullName: "Nikola Ćetković"
    },
    {
      oldUsername: "gruica@servistodosijevic.me",
      newUsername: "gruica@frigosistemtodosijevic.com",
      email: "gruica@frigosistemtodosijevic.com", 
      password: "Gruica1.",
      fullName: "Gruica Todosijević"
    }
  ];

  for (const tech of technicians) {
    console.log(`\nAžuriram servisera: ${tech.fullName}`);
    
    // Pronađi korisnika po starom username-u
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, tech.oldUsername))
      .limit(1);
    
    if (existingUser.length === 0) {
      console.log(`⚠️  Korisnik ${tech.oldUsername} nije pronađen`);
      continue;
    }
    
    const user = existingUser[0];
    console.log(`✅ Pronađen korisnik ID: ${user.id}`);
    
    // Hash-uj novu lozinku
    const hashedPassword = await hashPassword(tech.password);
    
    // Ažuriraj podatke
    await db
      .update(users)
      .set({
        username: tech.newUsername,
        email: tech.email,
        password: hashedPassword,
        full_name: tech.fullName
      })
      .where(eq(users.id, user.id));
    
    console.log(`✅ Uspešno ažuriran: ${tech.newUsername}`);
    console.log(`   - Email: ${tech.email}`);
    console.log(`   - Lozinka: ${tech.password}`);
  }
  
  console.log("\n🎉 Svi serviseri su uspešno ažurirani!");
  
  // Prikaži finalne podatke
  console.log("\n📋 Finalni podaci servisera:");
  const updatedTechnicians = await db
    .select()
    .from(users)
    .where(eq(users.role, "technician"));
  
  updatedTechnicians.forEach((tech, index) => {
    console.log(`${index + 1}. ${tech.full_name}`);
    console.log(`   Username: ${tech.username}`);
    console.log(`   Email: ${tech.email}`);
    console.log(`   Role: ${tech.role}`);
    console.log("");
  });
}

updateTechnicianAccounts()
  .then(() => {
    console.log("Skripta završena uspešno!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Greška:", error);
    process.exit(1);
  });