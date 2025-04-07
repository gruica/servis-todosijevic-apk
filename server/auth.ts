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
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      secure: false, // postaviću na false da bi radilo u razvoju
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
          
          console.log(`Authentication successful for: ${username}`);
          return done(null, user);
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Korisničko ime već postoji");
      }

      // Password will be hashed in the storage.createUser method
      const user = await storage.createUser({
        ...req.body
      });

      // Remove password from the response
      const { password, ...userWithoutPassword } = user;

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Remove password from the response
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.status(200).json(userWithoutPassword);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Remove password from the response
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
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
