import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    
    if (!hashed || !salt) {
      console.error("Invalid stored password format:", stored);
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    if (hashedBuf.length !== suppliedBuf.length) {
      console.error(`Buffer length mismatch: ${hashedBuf.length} vs ${suppliedBuf.length}`);
      return false;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "supabaza-appliance-service-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: 'frigosistem_sid', // Specificiramo jedinstveno ime za cookie
    cookie: {
      secure: false, // Promenjen da uvek bude false za development
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dana
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
        session: true
      },
      async (username, password, done) => {
        try {
          console.log(`Attempting login with username: ${username}`);
          const user = await storage.getUserByUsername(username);
          
          if (!user) {
            console.log(`User not found: ${username}`);
            return done(null, false, { message: 'Neispravno korisničko ime ili lozinka' });
          }
          
          console.log(`User found: ${username}`);
          const isPasswordValid = await comparePasswords(password, user.password);
          
          if (!isPasswordValid) {
            console.log(`Invalid password for user: ${username}`);
            return done(null, false, { message: 'Neispravno korisničko ime ili lozinka' });
          }
          
          // Dodatna provera: da li je korisnik verifikovan
          // Administratori mogu da se prijave uvek, ostali korisnici moraju biti verifikovani
          if (user.role !== 'admin' && !user.isVerified) {
            console.log(`User ${username} is not verified`);
            return done(null, false, { message: 'Vaš nalog nije još verifikovan od strane administratora. Molimo sačekajte potvrdu.' });
          }
          
          console.log(`Authentication successful for: ${username}`);
          return done(null, user);
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user ID: ${user.id}`);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user with ID: ${id}`);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.error(`User not found for ID: ${id} during deserialization`);
        return done(null, false);
      }
      
      console.log(`User deserialized successfully: ${user.username}`);
      done(null, user);
    } catch (error) {
      console.error(`Error deserializing user ${id}:`, error);
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registracija - primljeni podaci:", {
        username: req.body.username,
        email: req.body.email,
        fullName: req.body.fullName,
        role: req.body.role,
        companyName: req.body.companyName,
        phone: req.body.phone
      });
      
      // Validacija obaveznih polja - dodato je email kao obavezno polje
      if (!req.body.username || !req.body.password || !req.body.fullName || !req.body.email) {
        console.log("Registracija neuspešna: nedostaju obavezna polja");
        return res.status(400).json({
          error: "Nepotpuni podaci",
          message: "Korisničko ime, lozinka, ime i email adresa su obavezna polja."
        });
      }

      // Validacija email formata
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.email)) {
        console.log("Registracija neuspešna: nevalidan email format");
        return res.status(400).json({
          error: "Nevalidan email",
          message: "Molimo unesite validnu email adresu."
        });
      }
      
      // Provera da li već postoji korisnik sa istim korisničkim imenom
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        console.log(`Registracija neuspešna: korisničko ime ${req.body.username} već postoji`);
        return res.status(400).json({
          error: "Korisničko ime već postoji",
          message: "Molimo odaberite drugo korisničko ime."
        });
      }
      
      // Provera email adrese ako je poslata
      if (req.body.email) {
        // Provera da li već postoji korisnik sa istim email-om
        const existingEmail = await storage.getUserByEmail(req.body.email);
        if (existingEmail) {
          console.log(`Registracija neuspešna: email ${req.body.email} već postoji`);
          return res.status(400).json({
            error: "Email adresa već postoji",
            message: "Korisnik sa ovom email adresom je već registrovan."
          });
        }
      }

      // Korisnički podaci za kreiranje
      const userData = {
        username: req.body.username,
        password: req.body.password,
        fullName: req.body.fullName,
        role: req.body.role || 'customer',
        email: req.body.email || req.body.username, // Garantujemo da uvek imamo email
        phone: req.body.phone || null,
        address: req.body.address || null,
        city: req.body.city || null,
        companyName: req.body.companyName || null,
        companyId: req.body.companyId || null,
        technicianId: req.body.technicianId || null,
        isVerified: req.body.role === 'admin', 
        registeredAt: new Date().toISOString()
      };
      
      // Posebni slučaj za poslovne partnere
      if (req.body.role === 'business_partner') {
        console.log("Registracija poslovnog partnera - obrađeni podaci:", {
          username: userData.username,
          fullName: userData.fullName,
          companyName: userData.companyName,
          email: userData.email,
          role: userData.role
        });
      }
      
      // Lozinka će biti heširana u storage.createUser metodi
      console.log("Pokušaj kreiranja korisnika...");
      const user = await storage.createUser(userData);
      console.log("Korisnik uspešno kreiran sa ID:", user.id);

      // Ukloni lozinku iz odgovora
      const { password, ...userWithoutPassword } = user;
      
      // Logujemo registraciju
      console.log(`Korisnik ${user.username} registrovan sa ulogom ${user.role}, status verifikacije: ${user.isVerified}`);
      
      // Administrator može odmah da se prijavi, ostali korisnici dobijaju poruku o potrebnoj verifikaciji
      if (user.role === 'admin') {
        req.login(user, (err) => {
          if (err) return next(err);
          res.status(201).json({
            ...userWithoutPassword,
            message: "Administrator uspešno registrovan i prijavljen."
          });
        });
      } else {
        // Za obične korisnike vraćamo samo podatke bez prijave
        // Posebna poruka za poslovne partnere
        if (user.role === 'business_partner') {
          res.status(201).json({
            ...userWithoutPassword,
            message: "Registracija uspešna! Vaš zahtev je prosleđen administratoru na pregled. Bićete obavešteni putem email-a kada je nalog aktiviran."
          });
        } else {
          res.status(201).json({
            ...userWithoutPassword,
            message: "Registracija uspešna! Molimo sačekajte da administrator verifikuje vaš nalog pre prijave."
          });
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: SelectUser | false, info: { message: string } | undefined) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed:", info?.message || "Neuspješna prijava");
        return res.status(401).json({ 
          error: info?.message || "Neispravno korisničko ime ili lozinka" 
        });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session establishment error:", loginErr);
          return next(loginErr);
        }
        
        // Uspješna prijava - logiram sesiju
        console.log(`Login successful, session established for user ${user.username} (ID: ${user.id}), session ID: ${req.sessionID}`);
        
        // Remove password from the response
        const { password, ...userWithoutPassword } = user as SelectUser;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    if (!req.isAuthenticated()) {
      console.log("Logout attempted but no user is authenticated");
      return res.sendStatus(200);
    }
    
    const userId = req.user?.id;
    const username = req.user?.username;
    const sessionId = req.sessionID;
    
    console.log(`Logging out user ${username} (ID: ${userId}), session ID: ${sessionId}`);
    
    req.logout((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return next(err);
      }
      
      console.log(`User ${username} successfully logged out`);
      
      // Uništi sesiju za dodatnu sigurnost
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Error destroying session:", sessionErr);
        } else {
          console.log(`Session ${sessionId} destroyed`);
        }
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Remove password from the response
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });
  
  // API za dohvatanje neverifikovanih korisnika (samo za administratore)
  app.get("/api/users/unverified", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Potrebna je prijava" });
      }
      
      // Provera da li je prijavljeni korisnik administrator
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Pristup zabranjen. Potrebna je administratorska uloga." });
      }
      
      // Dohvati neverifikovane korisnike
      const unverifiedUsers = await storage.getUnverifiedUsers();
      
      // Ukloni osetljive podatke pre slanja
      const safeUsers = unverifiedUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Greška pri dohvatanju neverifikovanih korisnika:", error);
      next(error);
    }
  });
  
  // API za verifikaciju korisnika (samo za administratore)
  app.post("/api/users/:id/verify", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Potrebna je prijava" });
      }
      
      // Provera da li je prijavljeni korisnik administrator
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Pristup zabranjen. Potrebna je administratorska uloga." });
      }
      
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      // Prvo proveri da li korisnik postoji
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      
      if (user.isVerified) {
        return res.status(400).json({ error: "Korisnik je već verifikovan" });
      }
      
      // Verifikuj korisnika
      const updatedUser = await storage.verifyUser(userId, req.user.id);
      
      if (!updatedUser) {
        return res.status(500).json({ error: "Greška pri verifikaciji korisnika" });
      }
      
      // Ukloni osetljive podatke pre slanja
      const { password, ...userWithoutPassword } = updatedUser;
      
      // Šalji email obaveštenja korisniku - implementirati kasnije
      
      res.json({
        success: true,
        message: "Korisnik uspešno verifikovan",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Greška pri verifikaciji korisnika:", error);
      next(error);
    }
  });
  
  // Ruta za promjenu šifre prijavljenog korisnika
  app.post("/api/change-password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Potrebna je prijava" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          error: "Trenutna i nova šifra su obavezna polja" 
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ 
          error: "Nova šifra mora imati najmanje 6 karaktera" 
        });
      }
      
      // Provjeri trenutnu šifru
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: "Trenutna šifra nije ispravna" });
      }
      
      // Heširanje nove šifre
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Ažuriranje šifre
      await storage.updateUser(user.id, {
        ...user,
        password: hashedNewPassword
      });
      
      return res.status(200).json({ 
        success: true,
        message: "Šifra uspješno promijenjena" 
      });
    } catch (error) {
      next(error);
    }
  });
}
