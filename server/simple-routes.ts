// NOVI JEDNOSTAVAN ROUTES FAJL - čist kod bez komplikacija
// Za testiranje novog photo sistema

import type { Express } from "express";
import { getServicePhotos, uploadPhoto } from "./simple-photos";

export function registerSimpleRoutes(app: Express): void {
  console.log("🚀 Registrujem jednostavne photo routes...");

  // GET fotografije - jednostavan pristup
  app.get("/api/simple-photos", getServicePhotos);

  // POST nova fotografija - lokalni uploads
  app.post("/api/simple-photos/upload", uploadPhoto);

  console.log("✅ Jednostavni photo routes registrovani");
}