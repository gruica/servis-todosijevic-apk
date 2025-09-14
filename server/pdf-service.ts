import puppeteer from 'puppeteer';
import { storage } from './storage';

interface ServicePDFData {
  service: any;
  client: any;
  appliance: any;
  technician: any;
}

export class PDFService {
  
  // Generisanje HTML template-a za PDF
  private generateServiceReportHTML(data: ServicePDFData): string {
    const { service, client, appliance, technician } = data;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Servisni izvještaj #${service.id}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2563eb;
          margin: 0;
          font-size: 28px;
        }
        .header h2 {
          color: #64748b;
          margin: 5px 0;
          font-size: 18px;
          font-weight: normal;
        }
        .section {
          margin-bottom: 25px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
        }
        .section-title {
          color: #1e40af;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          border-bottom: 2px solid #dbeafe;
          padding-bottom: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .info-item {
          margin-bottom: 10px;
        }
        .info-label {
          font-weight: bold;
          color: #475569;
          display: inline-block;
          width: 140px;
        }
        .info-value {
          color: #1e293b;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-in-progress { background: #dbeafe; color: #1d4ed8; }
        .status-completed { background: #d1fae5; color: #047857; }
        .status-cancelled { background: #fee2e2; color: #dc2626; }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }
        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        .signature-box {
          text-align: center;
          padding: 20px;
          border: 1px dashed #94a3b8;
          border-radius: 8px;
        }
        .date-created {
          text-align: right;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="date-created">
        Izvještaj kreiran: ${new Date().toLocaleDateString('sr-RS', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>

      <div class="header">
        <h1>FRIGO SISTEM TODOSIJEVIĆ</h1>
        <h2>Servisni izvještaj #${service.id}</h2>
        <p>Servis bijele tehnike | Crna Gora</p>
      </div>

      <div class="section">
        <div class="section-title">📋 Osnovne informacije o servisu</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="status-badge status-${service.status}">
                ${service.status === 'pending' ? 'Na čekanju' : 
                  service.status === 'in_progress' ? 'U toku' :
                  service.status === 'completed' ? 'Završen' :
                  service.status === 'cancelled' ? 'Otkazan' : service.status}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Prioritet:</span>
              <span class="info-value">${service.priority || 'Normalan'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Kreiran:</span>
              <span class="info-value">${new Date(service.createdAt).toLocaleDateString('sr-RS')}</span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Zakazano:</span>
              <span class="info-value">${service.scheduledDate ? new Date(service.scheduledDate).toLocaleDateString('sr-RS') : 'Nije zakazano'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Završeno:</span>
              <span class="info-value">${service.completedDate ? new Date(service.completedDate).toLocaleDateString('sr-RS') : 'Nije završeno'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Troškovi:</span>
              <span class="info-value">${service.cost || 'Nisu definisani'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">👤 Podaci o klijentu</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Ime i prezime:</span>
              <span class="info-value">${client.fullName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Telefon:</span>
              <span class="info-value">${client.phone}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span class="info-value">${client.email || 'Nije unesen'}</span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Adresa:</span>
              <span class="info-value">${client.address || 'Nije unesena'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Grad:</span>
              <span class="info-value">${client.city || 'Nije unesen'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🔧 Podaci o aparatu</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Kategorija:</span>
              <span class="info-value">${appliance.category?.name || 'Nepoznato'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Proizvođač:</span>
              <span class="info-value">${appliance.manufacturer?.name || 'Nepoznato'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Model:</span>
              <span class="info-value">${appliance.model || 'Nije unesen'}</span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Serijski broj:</span>
              <span class="info-value">${appliance.serialNumber || 'Nije unesen'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Datum kupovine:</span>
              <span class="info-value">${appliance.purchaseDate ? new Date(appliance.purchaseDate).toLocaleDateString('sr-RS') : 'Nije unesen'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🛠️ Serviser i tehnički detalji</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Serviser:</span>
              <span class="info-value">${technician?.fullName || 'Nije dodeljen'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Specijalizacija:</span>
              <span class="info-value">${technician?.specialization || 'Nije specificirana'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Kontakt:</span>
              <span class="info-value">${technician?.phone || 'Nije unesen'}</span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Potpuno ispravljeno:</span>
              <span class="info-value">${service.isCompletelyFixed ? 'Da' : 'Ne'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Uređaj preuzet:</span>
              <span class="info-value">${service.devicePickedUp ? 'Da' : 'Ne'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📝 Opis problema i rešenje</div>
        <div style="margin-bottom: 15px;">
          <div class="info-label" style="display: block; margin-bottom: 5px;">Opis problema:</div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
            ${service.description || 'Opis nije unesen'}
          </div>
        </div>
        ${service.technicianNotes ? `
        <div style="margin-bottom: 15px;">
          <div class="info-label" style="display: block; margin-bottom: 5px;">Napomene servisera:</div>
          <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #059669;">
            ${service.technicianNotes}
          </div>
        </div>
        ` : ''}
        ${service.usedParts ? `
        <div>
          <div class="info-label" style="display: block; margin-bottom: 5px;">Korišćeni rezervni delovi:</div>
          <div style="background: #fefce8; padding: 15px; border-radius: 6px; border-left: 4px solid #ca8a04;">
            ${service.usedParts}
          </div>
        </div>
        ` : ''}
      </div>

      <div class="signature-section">
        <div class="signature-box">
          <div style="margin-bottom: 40px;">Potpis servisera</div>
          <div>_________________________</div>
          <div style="margin-top: 10px; font-size: 12px;">${technician?.fullName || 'Ime servisera'}</div>
        </div>
        <div class="signature-box">
          <div style="margin-bottom: 40px;">Potpis klijenta</div>
          <div>_________________________</div>
          <div style="margin-top: 10px; font-size: 12px;">${client.fullName}</div>
        </div>
      </div>

      <div class="footer">
        <p><strong>FRIGO SISTEM TODOSIJEVIĆ</strong></p>
        <p>Servis bijele tehnike | Crna Gora</p>
        <p>Ovaj izvještaj je automatski generisan ${new Date().toLocaleDateString('sr-RS')}</p>
      </div>
    </body>
    </html>
    `;
  }

  // Generisanje PDF-a
  async generateServiceReportPDF(serviceId: number): Promise<Buffer> {
    let browser = null;
    
    try {
      console.log(`📄 Generisanje PDF izvještaja za servis ID: ${serviceId}`);
      
      // Dohvatanje podataka o servisu
      const serviceData = await this.getServiceData(serviceId);
      if (!serviceData) {
        throw new Error(`Servis sa ID ${serviceId} nije pronađen`);
      }

      console.log(`📄 Podaci servisa dohvaćeni uspešno`);

      // Pokretanje puppeteer-a
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-default-apps',
          '--disable-features=TranslateUI'
        ]
      });

      const page = await browser.newPage();
      
      // Postavljanje viewport-a za A4
      await page.setViewport({
        width: 794,
        height: 1123,
        deviceScaleFactor: 1,
      });

      console.log(`📄 Browser pokrenut, generisanje HTML template-a...`);

      // Generisanje HTML-a
      const htmlContent = this.generateServiceReportHTML(serviceData);
      
      // Učitavanje HTML sadržaja
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      console.log(`📄 HTML učitan, generisanje PDF-a...`);

      // Generisanje PDF-a
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      });

      console.log(`📄 ✅ PDF uspešno generisan (${pdfBuffer.length} bytes)`);
      
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error(`📄 ❌ Greška pri generisanju PDF-a:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
        console.log(`📄 Browser zatvoren`);
      }
    }
  }

  // Dohvatanje podataka servisa iz baze
  private async getServiceData(serviceId: number): Promise<ServicePDFData | null> {
    try {
      console.log(`📊 Dohvatanje podataka servisa ${serviceId} iz baze...`);
      
      // Koristi postojeći storage interface sa details
      const service = await storage.getServiceWithDetails(serviceId);
      if (!service) {
        console.log(`📊 ❌ Servis ${serviceId} nije pronađen`);
        return null;
      }

      console.log(`📊 ✅ Servis sa detaljima dohvaćen: ${service.id}`);
      
      return {
        service,
        client: service.client,
        appliance: service.appliance, 
        technician: service.technician
      };
      
    } catch (error) {
      console.error(`📊 ❌ Greška pri dohvatanju podataka servisa:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const pdfService = new PDFService();