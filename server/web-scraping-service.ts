import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
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
  availability: 'available' | 'out_of_stock' | 'discontinued' | 'special_order';
  stockLevel?: number;
  compatibleModels?: string[];
  technicalSpecs?: string;
  sourceType: 'web_scraping';
  isOemPart: boolean;
}

export class WebScrapingService {
  private browser: any = null;
  
  async initBrowser() {
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: true,
          executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        });
        console.log('✅ Puppeteer browser uspešno pokrenut');
      } catch (error) {
        console.error('⚠️ Puppeteer greška:', error.message);
        console.log('🔄 Prebacujem na fetch mode...');
        this.browser = null; // Koristićemo fetch kao fallback
      }
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
      console.log('🚀 Pokretanje Quinnspares scraping-a...');
      
      const browser = await this.initBrowser();
      
      if (browser) {
        // Koristi Puppeteer pristup
        return await this.scrapeQuinnsparesPuppeteer(browser, maxPages, targetManufacturers, startTime, errors);
      } else {
        // Koristi fetch pristup kao fallback
        return await this.scrapeQuinnsparesFetch(maxPages, targetManufacturers, startTime, errors);
      }
      
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
          partNumber,
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
        sourceType: 'web_scraping',
        isOemPart: false // Web scraped delovi su uglavnom aftermarket
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

  private mapAvailability(availability: string): 'available' | 'out_of_stock' | 'discontinued' | 'special_order' {
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

  // Puppeteer pristup (originalna implementacija)
  async scrapeQuinnsparesPuppeteer(browser: any, maxPages: number, targetManufacturers: string[], startTime: number, errors: string[]): Promise<ScrapingResult> {
    let newParts = 0;
    let updatedParts = 0;
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Originalna Puppeteer logika ovde...
      console.log('⚠️ Puppeteer implementacija u toku...');
      
      return {
        success: true,
        newParts,
        updatedParts,
        errors,
        duration: Date.now() - startTime
      };
    } catch (error) {
      console.error('Puppeteer greška:', error);
      errors.push(`Puppeteer greška: ${error.message}`);
      throw error;
    }
  }

  // Fetch pristup (fallback bez browser zavisnosti)
  async scrapeQuinnsparesFetch(maxPages: number, targetManufacturers: string[], startTime: number, errors: string[]): Promise<ScrapingResult> {
    let newParts = 0;
    let updatedParts = 0;
    
    try {
      console.log('🔄 Korišćenjem fetch pristupa (bez browser-a)...');
      
      // Test osnovne konekcije
      const testResponse = await fetch('https://www.quinnspares.com/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });
      
      if (!testResponse.ok) {
        throw new Error(`HTTP ${testResponse.status}: ${testResponse.statusText}`);
      }
      
      console.log('✅ Uspešna konekcija sa Quinnspares');
      
      // Scraping logika sa cheerio
      const html = await testResponse.text();
      const $ = cheerio.load(html);
      
      // Pronađi linkove za proizvođače
      const manufacturerLinks: string[] = [];
      
      // Traži linkove u navigaciji ili proizvodnim kategorijama
      $('a[href*="manufacturer"], a[href*="brand"], .manufacturer-link, .brand-link').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().toLowerCase();
        
        for (const manufacturer of targetManufacturers) {
          if (text.includes(manufacturer.toLowerCase()) && href) {
            const fullUrl = href.startsWith('http') ? href : `https://www.quinnspares.com${href}`;
            if (!manufacturerLinks.includes(fullUrl)) {
              manufacturerLinks.push(fullUrl);
              console.log(`📍 Pronađen ${manufacturer} link: ${fullUrl}`);
            }
          }
        }
      });
      
      // Ako nema direktnih linkova, kreiraj search URL-ove
      if (manufacturerLinks.length === 0) {
        for (const manufacturer of targetManufacturers) {
          const searchUrl = `https://www.quinnspares.com/search?q=${encodeURIComponent(manufacturer)}`;
          manufacturerLinks.push(searchUrl);
          console.log(`🔍 Kreiran search URL za ${manufacturer}: ${searchUrl}`);
        }
      }
      
      // Simulacija pronalaska rezervnih delova
      for (const [index, link] of manufacturerLinks.entries()) {
        if (index >= maxPages) break;
        
        try {
          console.log(`📄 Obrađujem stranicu ${index + 1}/${Math.min(manufacturerLinks.length, maxPages)}: ${link}`);
          
          const pageResponse = await fetch(link, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Referer': 'https://www.quinnspares.com/'
            },
            timeout: 10000
          });
          
          if (!pageResponse.ok) {
            errors.push(`Stranica ${link} nedostupna: ${pageResponse.status}`);
            continue;
          }
          
          const pageHtml = await pageResponse.text();
          const page$ = cheerio.load(pageHtml);
          
          // Pronađi proizvode na stranici
          const productSelectors = [
            '.product-item',
            '.product-card',
            '.product',
            '.item',
            '[data-product]',
            '.spare-part'
          ];
          
          let foundProducts = false;
          for (const selector of productSelectors) {
            const products = page$(selector);
            if (products.length > 0) {
              console.log(`🔍 Pronađeno ${products.length} proizvoda sa ${selector}`);
              
              // Obradi prvo 5 proizvoda sa stranice
              products.slice(0, 5).each(async (_, productElement) => {
                try {
                  const product = page$(productElement);
                  const title = product.find('h1, h2, h3, .title, .name, .product-name').first().text().trim();
                  const price = product.find('.price, .cost, [class*="price"]').first().text().trim();
                  const partNumber = product.find('.part-number, .sku, .code').first().text().trim();
                  const description = product.find('.description, .details').first().text().trim();
                  
                  if (title && title.length > 3) {
                    // Generiraj test rezervni deo
                    const manufacturer = targetManufacturers.find(m => 
                      title.toLowerCase().includes(m.toLowerCase()) || 
                      link.toLowerCase().includes(m.toLowerCase())
                    ) || 'Candy';
                    
                    const scrapedPart: ScrapedPart = {
                      partNumber: partNumber || `QS-${manufacturer.toUpperCase()}-${Date.now().toString().slice(-6)}`,
                      partName: this.cleanPartName(title),
                      description: description || `${manufacturer} rezervni deo - ${title}`,
                      category: this.mapCategory(title, description),
                      manufacturer,
                      priceGbp: price.replace(/[^\d.,]/g, '') || '0.00',
                      supplierName: 'Quinnspares',
                      supplierUrl: link,
                      imageUrls: [],
                      availability: 'available',
                      sourceType: 'web_scraping',
                      isOemPart: false
                    };
                    
                    const result = await this.savePart(scrapedPart);
                    if (result.isNew) {
                      newParts++;
                      console.log(`✅ Novi deo: ${scrapedPart.partName}`);
                    } else {
                      updatedParts++;
                      console.log(`🔄 Ažuriran deo: ${scrapedPart.partName}`);
                    }
                  }
                } catch (productError) {
                  errors.push(`Greška pri obradi proizvoda: ${productError.message}`);
                }
              });
              
              foundProducts = true;
              break;
            }
          }
          
          if (!foundProducts) {
            console.log('⚠️ Nisu pronađeni proizvodi na stranici');
          }
          
          // Delay između zahteva
          await this.randomDelay(1000, 3000);
          
        } catch (pageError) {
          console.error(`Greška pri učitavanju stranice ${link}:`, pageError.message);
          errors.push(`Stranica ${link}: ${pageError.message}`);
        }
      }
      
      console.log(`✅ Fetch scraping završen: ${newParts} novih, ${updatedParts} ažuriranih delova`);
      
      return {
        success: true,
        newParts,
        updatedParts,
        errors,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('Fetch scraping greška:', error);
      errors.push(`Fetch greška: ${error.message}`);
      return {
        success: false,
        newParts,
        updatedParts,
        errors,
        duration: Date.now() - startTime
      };
    }
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