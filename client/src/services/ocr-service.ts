import { createWorker } from 'tesseract.js';

export interface ScannedData {
  model?: string;
  serialNumber?: string;
  productNumber?: string;
  confidence: number;
}

export class OCRService {
  private worker: any = null;

  async initialize(): Promise<void> {
    this.worker = await createWorker();
    await this.worker.loadLanguage('eng');
    await this.worker.initialize('eng');
    
    // Optimizacija za čitanje serijskih brojeva i modela
    await this.worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/.',
      tessedit_pageseg_mode: '6', // Uniform block of text
      tessedit_ocr_engine_mode: '2' // LSTM OCR engine
    });
  }

  async scanImage(imageData: string): Promise<ScannedData> {
    if (!this.worker) {
      await this.initialize();
    }

    const { data: { text, confidence } } = await this.worker.recognize(imageData);
    
    return this.parseText(text, confidence);
  }

  private parseText(text: string, confidence: number): ScannedData {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const result: ScannedData = { confidence };

    for (const line of lines) {
      // Pattern za model brojeve - različiti formati
      const modelPatterns = [
        /(?:MOD|MODEL|MODELL?)[:.\s]*([A-Z0-9\-\/]+)/i,
        /^([A-Z]{2,}[0-9]{2,}[A-Z0-9\-\/]*)$/i,
        /([A-Z]{3,}[0-9]{3,})/i
      ];

      // Pattern za serijske brojeve - duži brojevi
      const serialPatterns = [
        /(?:S\/N|SN|SERIAL|SER)[:.\s]*([A-Z0-9]{6,})/i,
        /^([0-9]{8,}[A-Z0-9]*)$/i,
        /([A-Z0-9]{10,})/i
      ];

      // Pattern za product number
      const productPatterns = [
        /(?:P\/N|PN|PRODUCT|PROD)[:.\s]*([A-Z0-9\-\/]+)/i,
        /(?:CODE|KOD)[:.\s]*([A-Z0-9\-\/]+)/i
      ];

      // Pokušaj prepoznavanja modela
      if (!result.model) {
        for (const pattern of modelPatterns) {
          const match = line.match(pattern);
          if (match && match[1] && match[1].length >= 3) {
            result.model = match[1].trim();
            break;
          }
        }
      }

      // Pokušaj prepoznavanja serijskog broja
      if (!result.serialNumber) {
        for (const pattern of serialPatterns) {
          const match = line.match(pattern);
          if (match && match[1] && match[1].length >= 6) {
            result.serialNumber = match[1].trim();
            break;
          }
        }
      }

      // Pokušaj prepoznavanja product number
      if (!result.productNumber) {
        for (const pattern of productPatterns) {
          const match = line.match(pattern);
          if (match && match[1] && match[1].length >= 3) {
            result.productNumber = match[1].trim();
            break;
          }
        }
      }
    }

    // Fallback - pokušaj prepoznavanja iz slobodnog teksta
    if (!result.model || !result.serialNumber) {
      this.extractFromFreeText(lines, result);
    }

    return result;
  }

  private extractFromFreeText(lines: string[], result: ScannedData): void {
    for (const line of lines) {
      const cleaned = line.replace(/[^A-Z0-9\-\/]/gi, '');
      
      // Pokušaj prepoznavanja modela (kratži kod sa slovima i brojevima)
      if (!result.model && /^[A-Z]{2,}[0-9]{2,}[A-Z0-9\-\/]*$/i.test(cleaned) && cleaned.length <= 15) {
        result.model = cleaned;
      }
      
      // Pokušaj prepoznavanja serijskog broja (duži kod, više brojeva)
      if (!result.serialNumber && /^[A-Z0-9]{8,}$/i.test(cleaned) && cleaned.length >= 8) {
        result.serialNumber = cleaned;
      }
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrService = new OCRService();