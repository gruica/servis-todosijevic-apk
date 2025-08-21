// NOVI JEDNOSTAVAN PHOTO SISTEM - kao servis 234
// Koristi samo lokalni uploads folder i Express static middleware

import { Request, Response } from 'express';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';

// Kreiranje uploads foldera ako ne postoji
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// GET fotografije za servis
export async function getServicePhotos(req: Request, res: Response) {
  try {
    const serviceId = parseInt(req.query.serviceId as string);
    
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId je obavezan' });
    }

    const photos = await storage.getServicePhotos(serviceId);
    res.json(photos);
  } catch (error) {
    console.error('Greška pri dohvatanju fotografija:', error);
    res.status(500).json({ error: 'Greška servera' });
  }
}

// POST nova fotografija
export async function uploadPhoto(req: Request, res: Response) {
  try {
    const { base64Data, serviceId, description, category } = req.body;
    
    if (!base64Data || !serviceId) {
      return res.status(400).json({ error: 'base64Data i serviceId su obavezni' });
    }

    // Dekodiranje base64
    const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Nevaljan base64 format' });
    }

    const imageType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');
    
    // Kreiranje unique filename
    const filename = `service_${serviceId}_${uuidv4()}.${imageType}`;
    const filePath = path.join(uploadsDir, filename);
    
    // Čuvanje fajla
    writeFileSync(filePath, imageBuffer);
    
    // Čuvanje u bazu
    const photoPath = `/uploads/${filename}`;
    const photo = await storage.createServicePhoto({
      serviceId: serviceId,
      photoPath: photoPath,
      description: description || '',
      uploadedBy: (req as any).user?.id || 1,
      category: category || 'general'
    });

    console.log(`✅ Fotografija sačuvana: ${filename}`);
    res.json({ 
      success: true, 
      photo: photo,
      url: photoPath 
    });

  } catch (error) {
    console.error('Greška pri upload-u:', error);
    res.status(500).json({ error: 'Greška servera' });
  }
}