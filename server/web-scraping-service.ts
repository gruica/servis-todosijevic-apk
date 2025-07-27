import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { storage } from './storage.js';
import type { SparePartsCatalog, SparePartCategory } from '../shared/schema.js';

export interface ScrapingResult {
  success: boolean;
  newParts: number;
  updatedParts: number;
  errors: string[];
  duration: number;
}

export interface ScrapedPart {
  partNumber: string;
  partName: string;
  description?: string;
  category: SparePartCategory;
  manufacturer: string;
  priceEur?: string;
  priceGbp?: string;
  supplierName: string;
  supplierUrl: string;
  imageUrls?: string[];
  availability: string;
  stockLevel?: number;
  compatibleModels?: string[];
  technicalSpecs?: string;
  sourceType: 'web_scraping';
}

export class WebScrapingService {
  private browser: any = null;
  
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Quinnspares scraper - najveći dobavljač sa strukturiranim podacima
  async scrapeQuinnspares(maxPages: number = 50, targetManufacturers: string[] = ['Candy', 'Beko', 'Electrolux', 'Hoover']): Promise<ScrapingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let newParts = 0;
    let updatedParts = 0;
    
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      console.log('🚀 Pokretanje Quinnspares scraping-a...');
      
      for (const manufacturer of targetManufacturers) {
        try {
          console.log(`📋 Scraping ${manufacturer} delova...`);
          
          // Navigiraj na manufacturer stranicu
          const manufacturerUrl = `https://www.quinnspares.com/brand/${manufacturer.toLowerCase()}`;
          await page.goto(manufacturerUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          
          // Izvuci linkove proizvoda
          const productLinks = await page.evaluate(() => {
            const links: string[] = [];
            const productElements = document.querySelectorAll('a[href*="/product/"]');
            productElements.forEach(link => {
              const href = (link as HTMLAnchorElement).href;
              if (href && !links.includes(href)) {
                links.push(href);
              }
            });
            return links.slice(0, 100); // Limitiraj na 100 proizvoda po manufactureru
          });
          
          console.log(`🔍 Pronađeno ${productLinks.length} proizvoda za ${manufacturer}`);
          
          for (let i = 0; i < Math.min(productLinks.length, maxPages); i++) {
            try {
              const productUrl = productLinks[i];
              await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 20000 });
              
              const scrapedPart = await this.extractQuinnsparesPart(page, manufacturer);
              if (scrapedPart) {
                const result = await this.savePart(scrapedPart);
                if (result.isNew) {
                  newParts++;
                } else {
                  updatedParts++;
                }
              }
              
              // Dodaj delay između zahteva
              await this.randomDelay(1000, 3000);
              
            } catch (error) {
              errors.push(`Greška pri scraping-u ${productLinks[i]}: ${error}`);
              console.error(`❌ Greška pri scraping-u proizvoda: ${error}`);
            }
          }
          
        } catch (error) {
          errors.push(`Greška pri scraping-u ${manufacturer}: ${error}`);
          console.error(`❌ Greška pri scraping-u ${manufacturer}: ${error}`);
        }
      }
      
    } catch (error) {
      errors.push(`Kritična greška: ${error}`);
      console.error(`💥 Kritična greška: ${error}`);
    } finally {
      await this.closeBrowser();
    }
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`✅ Scraping završen: ${newParts} novih, ${updatedParts} ažuriranih, ${errors.length} grešaka za ${duration}s`);
    
    return {
      success: errors.length < 50, // Uspešan ako je manje od 50 grešaka
      newParts,
      updatedParts,
      errors,
      duration
    };
  }

  private async extractQuinnsparesPart(page: any, manufacturer: string): Promise<ScrapedPart | null> {
    try {
      const partData = await page.evaluate(() => {
        const getTextContent = (selector: string) => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || '';
        };
        
        const getAttributeContent = (selector: string, attribute: string) => {
          const element = document.querySelector(selector);
          return element?.getAttribute(attribute) || '';
        };
        
        // Osnovni podaci
        const title = getTextContent('h1') || getTextContent('.product-title') || getTextContent('.title');
        const description = getTextContent('.product-description') || getTextContent('.description');
        const price = getTextContent('.price') || getTextContent('.product-price') || getTextContent('[class*="price"]');
        const partNumber = getTextContent('.part-number') || getTextContent('.sku') || getTextContent('[class*="part"]');
        const availability = getTextContent('.availability') || getTextContent('.stock') || 'available';
        
        // Slika
        const mainImage = getAttributeContent('img[class*="product"]', 'src') || 
                         getAttributeContent('.product-image img', 'src') ||
                         getAttributeContent('img[alt*="product"]', 'src');
        
        // Kompatibilni modeli iz tabele ili liste
        const compatibleModels: string[] = [];
        const modelElements = document.querySelectorAll('.compatible-models li, .models li, [class*="model"] li');
        modelElements.forEach(el => {
          const model = el.textContent?.trim();
          if (model && model.length > 2) {
            compatibleModels.push(model);
          }
        });
        
        return {
          title,
          description,
          price,
          partNumber: partNumber || this.generatePartNumber(title),
          availability,
          mainImage,
          compatibleModels,
          url: window.location.href
        };
      });
      
      // Generiraj kataloški broj ako nije pronađen
      const generatePartNumber = (title: string): string => {
        const cleaned = title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return `QS-${manufacturer.toUpperCase()}-${cleaned.slice(0, 10)}-${Date.now().toString().slice(-4)}`;
      };
      
      const partNumber = partData.partNumber || generatePartNumber(partData.title);
      
      // Mapiranje kategorije na osnovu naziva
      const category = this.mapCategory(partData.title, partData.description);
      
      // Izvuci cenu
      const priceMatch = partData.price.match(/[\d.,]+/);
      const priceValue = priceMatch ? priceMatch[0] : '';
      
      const scrapedPart: ScrapedPart = {
        partNumber,
        partName: this.cleanPartName(partData.title),
        description: partData.description || `${manufacturer} rezervni deo - ${partData.title}`,
        category,
        manufacturer,
        priceGbp: priceValue,
        supplierName: 'Quinnspares',
        supplierUrl: partData.url,
        imageUrls: partData.mainImage ? [partData.mainImage] : [],
        availability: this.mapAvailability(partData.availability),
        compatibleModels: partData.compatibleModels.length > 0 ? partData.compatibleModels : undefined,
        sourceType: 'web_scraping'
      };
      
      return scrapedPart;
      
    } catch (error) {
      console.error('Greška pri ekstraktovanju podataka:', error);
      return null;
    }
  }

  private async savePart(scrapedPart: ScrapedPart): Promise<{ isNew: boolean }> {
    try {
      // Proveri da li deo već postoji
      const existingParts = await storage.getSparePartsCatalog();
      const existingPart = existingParts.find(p => 
        p.partNumber === scrapedPart.partNumber || 
        (p.partName === scrapedPart.partName && p.manufacturer === scrapedPart.manufacturer)
      );
      
      if (existingPart) {
        // Ažuriraj postojeći deo
        await storage.updateSparePartsCatalog(existingPart.id, {
          ...scrapedPart,
          lastUpdated: new Date()
        });
        return { isNew: false };
      } else {
        // Kreiraj novi deo
        await storage.createSparePartsCatalog(scrapedPart);
        return { isNew: true };
      }
    } catch (error) {
      console.error('Greška pri čuvanju dela:', error);
      throw error;
    }
  }

  private mapCategory(title: string, description: string): SparePartCategory {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('washing') || text.includes('veš') || text.includes('washer')) return 'washing-machine';
    if (text.includes('dishwasher') || text.includes('sudopera') || text.includes('dish')) return 'dishwasher';
    if (text.includes('oven') || text.includes('šporet') || text.includes('pećnica') || text.includes('cooker')) return 'oven';
    if (text.includes('hood') || text.includes('aspirator') || text.includes('extractor')) return 'cooker-hood';
    if (text.includes('dryer') || text.includes('sušilica') || text.includes('tumble')) return 'tumble-dryer';
    if (text.includes('fridge') || text.includes('freezer') || text.includes('frižider') || text.includes('zamrzivač')) return 'fridge-freezer';
    if (text.includes('microwave') || text.includes('mikrotalasna') || text.includes('micro')) return 'microwave';
    
    return 'universal'; // Default kategorija
  }

  private mapAvailability(availability: string): string {
    const av = availability.toLowerCase();
    if (av.includes('out') || av.includes('stock') || av.includes('nema')) return 'out_of_stock';
    if (av.includes('discontinued') || av.includes('prestalo')) return 'discontinued';
    if (av.includes('special') || av.includes('order')) return 'special_order';
    return 'available';
  }

  private cleanPartName(title: string): string {
    // Ukloni višak informacija i ostavi samo osnovni naziv
    return title
      .replace(/\s+/g, ' ')
      .replace(/^(Original|OEM|Genuine|Originalni)\s*/i, '')
      .trim()
      .slice(0, 200); // Ograniči na 200 karaktera
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // eSpares scraper - drugi najveći dobavljač
  async scrapeESpares(maxPages: number = 30, targetManufacturers: string[] = ['Candy', 'Beko']): Promise<ScrapingResult> {
    // Implementacija slična kao za Quinnspares
    console.log('🔄 eSpares scraping će biti implementiran u sledećoj fazi...');
    return {
      success: true,
      newParts: 0,
      updatedParts: 0,
      errors: [],
      duration: 0
    };
  }

  // Glavni metod za pokretanje svih scraper-a
  async runFullScraping(): Promise<ScrapingResult> {
    console.log('🚀 Pokretanje kompletnog web scraping-a...');
    
    const results: ScrapingResult[] = [];
    
    // Scrape Quinnspares
    const quinnResult = await this.scrapeQuinnspares(50, ['Candy', 'Beko', 'Electrolux', 'Hoover']);
    results.push(quinnResult);
    
    // Kombiniraj rezultate
    const totalResult: ScrapingResult = {
      success: results.every(r => r.success),
      newParts: results.reduce((sum, r) => sum + r.newParts, 0),
      updatedParts: results.reduce((sum, r) => sum + r.updatedParts, 0),
      errors: results.flatMap(r => r.errors),
      duration: results.reduce((sum, r) => sum + r.duration, 0)
    };
    
    console.log(`✅ Kompletan scraping završen: ${totalResult.newParts} novih delova, ${totalResult.updatedParts} ažuriranih`);
    
    return totalResult;
  }
}

export const webScrapingService = new WebScrapingService();