import { createWorker } from 'tesseract.js';

export interface ScannedData {
  model?: string;
  serialNumber?: string;
  productNumber?: string;
  manufacturerCode?: string;
  year?: string;
  confidence: number;
  extractedText?: string;
}

export interface OCRConfig {
  preprocessImage?: boolean;
  multipleAttempts?: boolean;
  manufacturerFocus?: string;
}

export class EnhancedOCRService {
  private worker: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Napredni pattern mapiranje za različite proizvođače
  private manufacturerPatterns = {
    beko: {
      model: [/(?:MOD|MODEL)[:.\s]*([A-Z]{2,}[0-9]{2,}[A-Z0-9]*)/i, /^([A-Z]{3,4}[0-9]{3,5}[A-Z]?)$/i],
      serial: [/(?:S\/N|SN)[:.\s]*([0-9]{8,12})/i, /^([0-9]{10,12})$/i],
      code: [/(?:P\/N|PN)[:.\s]*([0-9]{8,})/i]
    },
    electrolux: {
      model: [/(?:MOD|MODEL)[:.\s]*([A-Z]{2,}[0-9]{3,}[A-Z0-9]*)/i, /^([A-Z]{2,4}[0-9]{4,6}[A-Z]?)$/i],
      serial: [/(?:S\/N|SN)[:.\s]*([A-Z0-9]{8,})/i, /^([A-Z]{2}[0-9]{8,})$/i],
      code: [/(?:P\/N|PN)[:.\s]*([0-9]{9,})/i]
    },
    samsung: {
      model: [/(?:MOD|MODEL)[:.\s]*([A-Z]{2,}[0-9-]+[A-Z]*)/i, /^([A-Z]{2,4}[0-9-]{3,}[A-Z]*)$/i],
      serial: [/(?:S\/N|SN)[:.\s]*([A-Z0-9]{10,})/i, /^([A-Z]{4}[0-9]{6,})$/i],
      code: [/(?:P\/N|PN)[:.\s]*([A-Z0-9-]+)/i]
    },
    lg: {
      model: [/(?:MOD|MODEL)[:.\s]*([A-Z]{2,}[0-9]+[A-Z]*)/i, /^([A-Z]{2,4}[0-9]{3,}[A-Z]?)$/i],
      serial: [/(?:S\/N|SN)[:.\s]*([0-9]{8,})/i, /^([0-9]{8,12})$/i],
      code: [/(?:P\/N|PN)[:.\s]*([A-Z0-9]+)/i]
    },
    generic: {
      model: [
        /(?:MOD|MODEL|MODELL?)[:.\s]*([A-Z0-9\-\/]+)/i,
        /^([A-Z]{2,}[0-9]{2,}[A-Z0-9\-\/]*)$/i,
        /([A-Z]{3,}[0-9]{3,})/i
      ],
      serial: [
        /(?:S\/N|SN|SERIAL|SER)[:.\s]*([A-Z0-9]{6,})/i,
        /^([0-9]{8,}[A-Z0-9]*)$/i,
        /([A-Z0-9]{10,})/i
      ],
      code: [
        /(?:P\/N|PN|PRODUCT|PROD)[:.\s]*([A-Z0-9\-\/]+)/i,
        /(?:CODE|KOD)[:.\s]*([A-Z0-9\-\/]+)/i
      ]
    }
  };

  async initialize(config: OCRConfig = {}): Promise<void> {
    this.worker = await createWorker();
    await this.worker.loadLanguage('eng');
    await this.worker.initialize('eng');
    
    // Napredne postavke za bolju detekciju
    await this.worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/.: ',
      tessedit_pageseg_mode: '6', // Uniform block of text
      tessedit_ocr_engine_mode: '2', // LSTM OCR engine
      classify_bln_numeric_mode: '1'
    });

    // Inicijalizuj canvas za predobradu slike
    if (config.preprocessImage) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
  }

  private preprocessImage(imageData: string): string {
    if (!this.canvas || !this.ctx) return imageData;

    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      this.canvas!.width = width;
      this.canvas!.height = height;
      
      // Nacrtaj originalnu sliku
      this.ctx!.drawImage(img, 0, 0);
      
      // Dobij image data
      const imgData = this.ctx!.getImageData(0, 0, width, height);
      const data = imgData.data;
      
      // Primeni kontrast i brightness filter
      for (let i = 0; i < data.length; i += 4) {
        // Povećaj kontrast
        data[i] = this.clamp((data[i] - 128) * 1.5 + 128);     // Red
        data[i + 1] = this.clamp((data[i + 1] - 128) * 1.5 + 128); // Green
        data[i + 2] = this.clamp((data[i + 2] - 128) * 1.5 + 128); // Blue
        
        // Konvertuj u grayscale za bolju detekciju teksta
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      
      // Vrati obrađenu sliku
      this.ctx!.putImageData(imgData, 0, 0);
    };
    
    img.src = imageData;
    return this.canvas.toDataURL('image/jpeg', 0.9);
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(255, value));
  }

  async scanImage(imageData: string, config: OCRConfig = {}): Promise<ScannedData> {
    if (!this.worker) {
      await this.initialize(config);
    }

    let processedImage = imageData;
    if (config.preprocessImage) {
      processedImage = this.preprocessImage(imageData);
    }

    const results: ScannedData[] = [];

    // Pokušaj sa različitim parametrima ako je omogućeno
    if (config.multipleAttempts) {
      const attempts = [
        // Za serijske brojeve i model brojeve
        { pageseg: '6', whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/.: ', psm: 'single_block' },
        // Za kratki tekst (model/serijski broj)
        { pageseg: '8', whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-/', psm: 'single_word' },
        // Za pojedinačne karaktere u grupama
        { pageseg: '7', whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/.: ', psm: 'single_text_line' },
        // Specijalno za brojeve sa boljim threshold-om
        { pageseg: '6', whitelist: '0123456789-/', psm: 'single_block', threshold: 120 }
      ];

      for (const attempt of attempts) {
        await this.worker.setParameters({
          tessedit_char_whitelist: attempt.whitelist,
          tessedit_pageseg_mode: attempt.pageseg
        });

        const { data: { text, confidence } } = await this.worker.recognize(processedImage);
        const parsed = this.parseText(text, confidence, config.manufacturerFocus);
        results.push(parsed);
      }

      // Vrati najbolji rezultat
      return this.getBestResult(results);
    } else {
      const { data: { text, confidence } } = await this.worker.recognize(processedImage);
      return this.parseText(text, confidence, config.manufacturerFocus);
    }
  }

  private parseText(text: string, confidence: number, manufacturerFocus?: string): ScannedData {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const result: ScannedData = { confidence, extractedText: text };

    // Detektuj proizvođača iz teksta
    const detectedManufacturer = this.detectManufacturer(text, manufacturerFocus);
    if (detectedManufacturer) {
      result.manufacturerCode = detectedManufacturer;
    }

    // Koristi specifične pattern-e za detektovani proizvođač
    const patterns = this.manufacturerPatterns[detectedManufacturer || 'generic'];

    for (const line of lines) {
      // Pokušaj prepoznavanja modela
      if (!result.model) {
        for (const pattern of patterns.model) {
          const match = line.match(pattern);
          if (match && match[1] && match[1].length >= 3) {
            result.model = this.cleanData(match[1]);
            break;
          }
        }
      }

      // Pokušaj prepoznavanja serijskog broja
      if (!result.serialNumber) {
        for (const pattern of patterns.serial) {
          const match = line.match(pattern);
          if (match && match[1] && match[1].length >= 6) {
            result.serialNumber = this.cleanData(match[1]);
            break;
          }
        }
      }

      // Pokušaj prepoznavanja product number
      if (!result.productNumber && patterns.code) {
        for (const pattern of patterns.code) {
          const match = line.match(pattern);
          if (match && match[1] && match[1].length >= 3) {
            result.productNumber = this.cleanData(match[1]);
            break;
          }
        }
      }

      // Pokušaj detekcije godine
      if (!result.year) {
        const yearMatch = line.match(/(?:20|19)([0-9]{2})/);
        if (yearMatch) {
          result.year = yearMatch[0];
        }
      }
    }

    // Fallback sa naprednom detekcijom
    this.enhancedFallbackExtraction(lines, result);

    return result;
  }

  private detectManufacturer(text: string, focus?: string): string {
    if (focus) return focus;

    const upperText = text.toUpperCase();
    if (upperText.includes('BEKO')) return 'beko';
    if (upperText.includes('ELECTROLUX')) return 'electrolux';
    if (upperText.includes('SAMSUNG')) return 'samsung';
    if (upperText.includes('LG')) return 'lg';
    
    return 'generic';
  }

  private cleanData(data: string): string {
    return data.trim().replace(/[^\w\-\/]/g, '').toUpperCase();
  }

  private enhancedFallbackExtraction(lines: string[], result: ScannedData): void {
    // Analiza frekvencije karaktera za bolje prepoznavanje
    const allText = lines.join(' ');
    const tokens = allText.split(/\s+/).filter(token => token.length > 2);

    for (const token of tokens) {
      const cleaned = this.cleanData(token);
      
      // Napredna heuristika za model
      if (!result.model && this.isLikelyModel(cleaned)) {
        result.model = cleaned;
      }
      
      // Napredna heuristika za serijski broj
      if (!result.serialNumber && this.isLikelySerial(cleaned)) {
        result.serialNumber = cleaned;
      }
    }
  }

  private isLikelyModel(text: string): boolean {
    // Model brojevi obično imaju kombinaciju slova i brojeva, nisu previše dugi
    return /^[A-Z]{2,4}[0-9]{2,6}[A-Z0-9]*$/i.test(text) && 
           text.length >= 4 && 
           text.length <= 12 &&
           /[A-Z]/.test(text) && 
           /[0-9]/.test(text);
  }

  private isLikelySerial(text: string): boolean {
    // Serijski brojevi su obično duži, više brojeva
    return text.length >= 8 && 
           text.length <= 20 &&
           (/^[0-9]{8,}$/.test(text) || /^[A-Z]{1,4}[0-9]{6,}$/.test(text));
  }

  private getBestResult(results: ScannedData[]): ScannedData {
    // Rangiraj rezultate po tome koliko podataka su našli i pouzdanosti
    return results.reduce((best, current) => {
      const currentScore = this.calculateScore(current);
      const bestScore = this.calculateScore(best);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateScore(result: ScannedData): number {
    let score = result.confidence;
    if (result.model) score += 30;
    if (result.serialNumber) score += 40;
    if (result.productNumber) score += 20;
    if (result.manufacturerCode) score += 10;
    return score;
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const enhancedOCRService = new EnhancedOCRService();