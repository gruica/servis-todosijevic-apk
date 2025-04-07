import { writeFileSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// ESM zamena za __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ova skripta proverava i ispravlja konfiguraciju sesija u auth.ts fajlu
 * Problem može biti u podešavanjima sesije koja ne pamti login stanje pravilno
 */
function fixSessionConfig() {
  try {
    console.log("Provera i popravka konfiguracije sesija...");
    
    // Putanja do fajla auth.ts
    const authFilePath = path.join(__dirname, "../server/auth.ts");
    
    // Pročitaj sadržaj fajla
    let content = readFileSync(authFilePath, "utf8");
    
    // Proveri da li postoji SESSION_SECRET i kreiraj ga ako ne postoji
    if (!process.env.SESSION_SECRET) {
      console.log("SESSION_SECRET nije postavljen. Dodajem ga u .env fajl...");
      
      // Generiši nasumični niz za SESSION_SECRET
      import * as crypto from "crypto";
      const sessionSecret = crypto.randomBytes(32).toString("hex");
      
      // Pokušaj dodati u .env fajl ako postoji
      try {
        const envPath = path.join(__dirname, "../.env");
        let envContent = "";
        
        try {
          envContent = readFileSync(envPath, "utf8");
          if (!envContent.includes("SESSION_SECRET")) {
            envContent += `\nSESSION_SECRET=${sessionSecret}\n`;
          }
        } catch (err) {
          // .env ne postoji, kreiraj novi
          envContent = `SESSION_SECRET=${sessionSecret}\n`;
        }
        
        writeFileSync(envPath, envContent);
        console.log("SESSION_SECRET dodat u .env fajl");
        
        // Postavi i u trenutnom procesu
        process.env.SESSION_SECRET = sessionSecret;
      } catch (err) {
        console.error("Greška pri čuvanju SESSION_SECRET u .env fajl:", err);
        console.log("Nastavljam sa ispravkom auth.ts fajla...");
      }
    }
    
    // Proverimo i ispravimo konfiguraciju sesije
    // 1. Prvo nađemo deo koda sa sessionSettings objektom
    const sessionSettingsRegex = /const\s+sessionSettings\s*:\s*session\.SessionOptions\s*=\s*\{[^}]*\}/s;
    const sessionSettingsMatch = content.match(sessionSettingsRegex);
    
    if (sessionSettingsMatch) {
      const currentConfig = sessionSettingsMatch[0];
      
      console.log("Pronađena konfiguracija sesija:");
      console.log(currentConfig);
      
      // Proveri da li ima potrebne postavke
      let newConfig = currentConfig;
      
      // Dodaj cookie atribut ako ne postoji
      if (!newConfig.includes("cookie")) {
        newConfig = newConfig.replace(/(\s*)(}\s*)$/, 
          '$1  cookie: {\n$1    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dana\n$1    httpOnly: true,\n$1    secure: process.env.NODE_ENV === "production",\n$1    sameSite: "lax"\n$1  },$2');
      } else if (!newConfig.includes("maxAge") || !newConfig.includes("sameSite")) {
        // Ima cookie atribut ali fali maxAge ili sameSite
        newConfig = newConfig.replace(/(cookie\s*:\s*\{[^}]*)(}\s*)/, 
          '$1  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dana\n    httpOnly: true,\n    secure: process.env.NODE_ENV === "production",\n    sameSite: "lax"\n  $2');
      }
      
      // Dodaj saveUninitialized: true ako nije već postavljeno
      if (newConfig.includes("saveUninitialized: false")) {
        newConfig = newConfig.replace("saveUninitialized: false", "saveUninitialized: true");
      }
      
      // Zameni staru konfiguraciju sa novom
      if (newConfig !== currentConfig) {
        content = content.replace(sessionSettingsRegex, newConfig);
        writeFileSync(authFilePath, content);
        console.log("Konfiguracija sesija ažurirana:");
        console.log(newConfig);
      } else {
        console.log("Konfiguracija sesija je već ispravna, nije potrebna izmena.");
      }
    } else {
      console.log("Nije pronađena konfiguracija sesija u auth.ts fajlu. Proverite ručno.");
    }
    
    console.log("Provera i popravka konfiguracije sesija završena.");
    
  } catch (error) {
    console.error("Greška pri proveri i popravci konfiguracije sesija:", error);
  }
}

// Pozovi funkciju
fixSessionConfig();