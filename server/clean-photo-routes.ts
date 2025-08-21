// ČIST PHOTO UPLOAD SISTEM - bez TypeScript grešaka
import type { Express } from "express";
import { promises as fs } from 'fs';
import path from 'path';
import { storage } from './storage';

// Middleware za JWT auth (jednostavan)
function jwtAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  // Jednostavan token check - u produkciji treba validacija
  req.user = { id: 12, role: 'technician' }; // Mock user za testiranje
  next();
}

export function registerCleanPhotoRoutes(app: Express): void {
  console.log("🚀 Registrujem ČISTE photo routes...");

  // ČIST BASE64 UPLOAD ENDPOINT
  app.post("/api/clean-photos/upload", jwtAuth, async (req, res) => {
    try {
      console.log("🚀 [CLEAN UPLOAD] ===== ČIST UPLOAD SISTEM =====");
      
      const { base64Data, serviceId, photoCategory, description } = req.body;
      
      if (!base64Data || !serviceId) {
        return res.status(400).json({ error: "base64Data i serviceId su obavezni" });
      }
      
      // Dekodiranje base64
      const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: "Nevaljan base64 format" });
      }

      const imageType = matches[1];
      const imageBuffer = Buffer.from(matches[2], 'base64');
      
      // Kreiranje unique filename
      const filename = `clean_service_${serviceId}_${Date.now()}.${imageType}`;
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Kreiranje uploads foldera
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const filePath = path.join(uploadsDir, filename);
      
      // Čuvanje fajla
      await fs.writeFile(filePath, imageBuffer);
      
      console.log(`✅ [CLEAN UPLOAD] Fajl sačuvan: ${filename}`);
      
      // Čuvanje u bazu
      const photoPath = `/uploads/${filename}`;
      const photo = await storage.createServicePhoto({
        serviceId: parseInt(serviceId),
        photoPath: photoPath,
        description: description || 'Clean upload test',
        uploadedBy: req.user?.id || 1,
        isBeforeRepair: false,
        category: photoCategory || 'general'
      });

      console.log(`✅ [CLEAN UPLOAD] Baza updated sa ID: ${photo.id}`);
      
      res.json({ 
        success: true, 
        photo: photo,
        url: photoPath,
        filename: filename
      });

    } catch (error) {
      console.error('❌ [CLEAN UPLOAD] Greška:', error);
      res.status(500).json({ error: 'Upload greška' });
    }
  });

  // ČIST GET PHOTOS ENDPOINT
  app.get("/api/clean-photos", async (req, res) => {
    try {
      const serviceId = req.query.serviceId;
      
      if (!serviceId) {
        return res.status(400).json({ error: 'serviceId required' });
      }

      const photos = await storage.getServicePhotos(parseInt(serviceId as string));
      console.log(`📸 [CLEAN GET] Found ${photos.length} photos for service ${serviceId}`);
      
      res.json(photos);
    } catch (error) {
      console.error('❌ [CLEAN GET] Greška:', error);
      res.status(500).json({ error: 'Get photos greška' });
    }
  });

  console.log("✅ ČISTI photo routes registrovani");
}