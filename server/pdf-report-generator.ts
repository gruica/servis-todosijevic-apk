import puppeteer from 'puppeteer';
import type { Service, Client, Appliance, Technician, ApplianceCategory, Manufacturer } from '@shared/schema';

// Enhanced service data interface for PDF generation
export interface ServiceReportData extends Service {
  client: Client;
  appliance: Appliance & {
    category: ApplianceCategory;
    manufacturer: Manufacturer;
  };
  technician?: Technician;
}

// Company information - adjust based on actual company details
const COMPANY_INFO = {
  name: 'Tehno Plus doo',
  address: 'Trg Republike 5, 11000 Beograd',
  phone: '+381 11 123 4567',
  email: 'info@tehnoplus.rs',
  pib: '123456789',
  pdv: 'RS123456789',
  businessUnit: 'Servisna jedinica Beograd',
  logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMTAwIDUwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMkY0RjRGIi8+Cjx0ZXh0IHg9IjUwIiB5PSIzMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlRlaG5vIFBsdXM8L3RleHQ+Cjwvc3ZnPgo='
};

// Status translations for Serbian
const STATUS_TRANSLATIONS = {
  'pending': 'Čekanje',
  'scheduled': 'Zakazano', 
  'in_progress': 'U procesu',
  'waiting_parts': 'Čeka delove',
  'device_parts_removed': 'Delovi uklonjeni',
  'completed': 'Završeno',
  'delivered': 'Isporučen',
  'device_returned': 'Vraćen uređaj',
  'cancelled': 'Otkazano',
  'client_not_home': 'Klijent nije kući',
  'client_not_answering': 'Klijent se ne javlja',
  'customer_refuses_repair': 'Kupac odbija popravku',
  'customer_refused_repair': 'Kupac odbio popravku',
  'repair_failed': 'Neuspešan servis'
};

// CSS styling for professional PDF reports
const PDF_STYLES = `
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Arial', sans-serif;
    font-size: 12px;
    line-height: 1.4;
    color: #333;
    background: white;
  }
  
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 20mm;
    margin: 0 auto;
    background: white;
    box-shadow: 0 0 5px rgba(0,0,0,0.1);
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 3px solid #2F4F4F;
  }
  
  .company-info {
    flex: 1;
  }
  
  .company-logo {
    width: 120px;
    height: 60px;
    margin-bottom: 10px;
  }
  
  .company-name {
    font-size: 24px;
    font-weight: bold;
    color: #2F4F4F;
    margin-bottom: 5px;
  }
  
  .company-details {
    font-size: 10px;
    color: #666;
    line-height: 1.3;
  }
  
  .report-info {
    text-align: right;
    font-size: 11px;
  }
  
  .report-title {
    font-size: 20px;
    font-weight: bold;
    color: #2F4F4F;
    margin-bottom: 15px;
    text-align: center;
    text-transform: uppercase;
  }
  
  .section {
    margin-bottom: 25px;
  }
  
  .section-title {
    font-size: 14px;
    font-weight: bold;
    color: #2F4F4F;
    margin-bottom: 10px;
    padding: 8px 0;
    border-bottom: 2px solid #E0E0E0;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }
  
  .info-group {
    background: #F8F9FA;
    padding: 15px;
    border-radius: 5px;
    border-left: 4px solid #2F4F4F;
  }
  
  .info-row {
    display: flex;
    margin-bottom: 8px;
  }
  
  .info-label {
    font-weight: bold;
    width: 120px;
    color: #555;
  }
  
  .info-value {
    flex: 1;
    color: #333;
  }
  
  .service-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    border: 1px solid #DDD;
  }
  
  .service-table th {
    background: #2F4F4F;
    color: white;
    padding: 12px 8px;
    text-align: left;
    font-weight: bold;
    font-size: 11px;
  }
  
  .service-table td {
    padding: 10px 8px;
    border-bottom: 1px solid #E0E0E0;
    font-size: 11px;
  }
  
  .service-table tbody tr:nth-child(even) {
    background: #F8F9FA;
  }
  
  .service-table tbody tr:hover {
    background: #E8F4F8;
  }
  
  .status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: bold;
    text-align: center;
  }
  
  .status-completed { background: #D4EDDA; color: #155724; }
  .status-pending { background: #FFF3CD; color: #856404; }
  .status-in-progress { background: #CCE7FF; color: #004085; }
  .status-problematic { background: #F8D7DA; color: #721C24; }
  .status-cancelled { background: #E2E3E5; color: #383D41; }
  
  .notes-section {
    background: #F8F9FA;
    padding: 15px;
    border-radius: 5px;
    border-left: 4px solid #17A2B8;
    margin: 15px 0;
  }
  
  .notes-title {
    font-weight: bold;
    color: #17A2B8;
    margin-bottom: 10px;
  }
  
  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #DDD;
    font-size: 10px;
    color: #666;
    text-align: center;
  }
  
  .signature-section {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
    padding-top: 20px;
  }
  
  .signature-box {
    width: 200px;
    text-align: center;
  }
  
  .signature-line {
    border-top: 1px solid #333;
    margin-top: 40px;
    padding-top: 5px;
    font-size: 10px;
  }
  
  .page-break {
    page-break-before: always;
  }
  
  @media print {
    .page {
      margin: 0;
      box-shadow: none;
    }
    
    body {
      background: white;
    }
  }
</style>
`;

/**
 * Generate individual service report PDF identical to the reference image
 */
export async function generateServiceReportPDF(serviceData: ServiceReportData): Promise<Buffer> {
  const browser = await puppeteer.launch({
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
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    
    const html = `
      <!DOCTYPE html>
      <html lang="sr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Izveštaj Servisa #${serviceData.id}</title>
        ${PDF_STYLES}
      </head>
      <body>
        <div class="page">
          ${generateServiceReportHeader(serviceData)}
          ${generateClientSection(serviceData)}
          ${generateApplianceSection(serviceData)}
          ${generateServiceDetailsSection(serviceData)}
          ${generateTechnicianReportSection(serviceData)}
          ${generateServiceTableSection(serviceData)}
          ${generateSignatureSection(serviceData)}
          ${generateFooter()}
        </div>
      </body>
      </html>
    `;
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    
    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}

/**
 * Generate group report for completed services
 */
export async function generateCompletedServicesReportPDF(services: ServiceReportData[]): Promise<Buffer> {
  const browser = await puppeteer.launch({
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
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    
    const completedServices = services.filter(s => s.status === 'completed' || s.status === 'delivered');
    
    const html = `
      <!DOCTYPE html>
      <html lang="sr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Izveštaj Završenih Servisa</title>
        ${PDF_STYLES}
      </head>
      <body>
        <div class="page">
          ${generateGroupReportHeader('Izveštaj Završenih Servisa', completedServices.length)}
          ${generateGroupReportSummary(completedServices)}
          ${generateGroupServiceTable(completedServices)}
          ${generateGroupReportFooter()}
        </div>
      </body>
      </html>
    `;
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    
    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}

/**
 * Generate report for pending services
 */
export async function generatePendingServicesReportPDF(services: ServiceReportData[]): Promise<Buffer> {
  const browser = await puppeteer.launch({
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
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    
    const pendingServices = services.filter(s => 
      s.status === 'pending' || 
      s.status === 'scheduled' || 
      s.status === 'in_progress' ||
      s.status === 'waiting_parts'
    );
    
    const html = `
      <!DOCTYPE html>
      <html lang="sr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Izveštaj Servisa na Čekanju</title>
        ${PDF_STYLES}
      </head>
      <body>
        <div class="page">
          ${generateGroupReportHeader('Izveštaj Servisa na Čekanju', pendingServices.length)}
          ${generateGroupReportSummary(pendingServices)}
          ${generateGroupServiceTable(pendingServices)}
          ${generateGroupReportFooter()}
        </div>
      </body>
      </html>
    `;
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    
    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}

/**
 * Generate report for problematic services
 */
export async function generateProblematicServicesReportPDF(services: ServiceReportData[]): Promise<Buffer> {
  const browser = await puppeteer.launch({
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
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    
    const problematicServices = services.filter(s => 
      s.status === 'cancelled' || 
      s.status === 'client_not_home' ||
      s.status === 'client_not_answering' ||
      s.status === 'customer_refuses_repair' ||
      s.status === 'customer_refused_repair' ||
      s.status === 'repair_failed' ||
      s.needsRescheduling ||
      s.customerRefusesRepair ||
      s.repairFailed
    );
    
    const html = `
      <!DOCTYPE html>
      <html lang="sr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Izveštaj Problematičnih Servisa</title>
        ${PDF_STYLES}
      </head>
      <body>
        <div class="page">
          ${generateGroupReportHeader('Izveštaj Problematičnih Servisa', problematicServices.length)}
          ${generateGroupReportSummary(problematicServices)}
          ${generateGroupServiceTable(problematicServices, true)}
          ${generateGroupReportFooter()}
        </div>
      </body>
      </html>
    `;
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    
    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}

// Helper functions for generating HTML sections

function generateServiceReportHeader(serviceData: ServiceReportData): string {
  const currentDate = new Date().toLocaleDateString('sr-RS');
  
  return `
    <div class="header">
      <div class="company-info">
        <img src="${COMPANY_INFO.logo}" alt="Logo" class="company-logo" />
        <div class="company-name">${COMPANY_INFO.name}</div>
        <div class="company-details">
          ${COMPANY_INFO.address}<br>
          Tel: ${COMPANY_INFO.phone} | Email: ${COMPANY_INFO.email}<br>
          PIB: ${COMPANY_INFO.pib} | PDV: ${COMPANY_INFO.pdv}
        </div>
      </div>
      <div class="report-info">
        <strong>Izveštaj Servisa #${serviceData.id}</strong><br>
        Datum izdavanja: ${currentDate}<br>
        ${COMPANY_INFO.businessUnit}
      </div>
    </div>
    <div class="report-title">Izveštaj o Izvršenoj Uslugu Servisa</div>
  `;
}

function generateClientSection(serviceData: ServiceReportData): string {
  return `
    <div class="section">
      <div class="section-title">Podaci o Komitentu</div>
      <div class="info-grid">
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Komitent:</span>
            <span class="info-value">${serviceData.client.fullName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Telefon:</span>
            <span class="info-value">${serviceData.client.phone || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${serviceData.client.email || 'N/A'}</span>
          </div>
        </div>
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Adresa:</span>
            <span class="info-value">${serviceData.client.address || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mesto:</span>
            <span class="info-value">${serviceData.client.city || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateApplianceSection(serviceData: ServiceReportData): string {
  return `
    <div class="section">
      <div class="section-title">Podaci o Uređaju</div>
      <div class="info-grid">
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Kategorija:</span>
            <span class="info-value">${serviceData.appliance.category.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Proizvođač:</span>
            <span class="info-value">${serviceData.appliance.manufacturer.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Model:</span>
            <span class="info-value">${serviceData.appliance.model || 'N/A'}</span>
          </div>
        </div>
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Serijski broj:</span>
            <span class="info-value">${serviceData.appliance.serialNumber || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Datum kupovine:</span>
            <span class="info-value">${serviceData.appliance.purchaseDate || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Garancija:</span>
            <span class="info-value">${serviceData.warrantyStatus}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateServiceDetailsSection(serviceData: ServiceReportData): string {
  return `
    <div class="section">
      <div class="section-title">Detalji Servisa</div>
      <div class="info-grid">
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Broj naloga:</span>
            <span class="info-value">#${serviceData.id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value">
              <span class="status-badge status-${getStatusClass(serviceData.status)}">
                ${STATUS_TRANSLATIONS[serviceData.status as keyof typeof STATUS_TRANSLATIONS] || serviceData.status}
              </span>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Servisér:</span>
            <span class="info-value">${serviceData.technician?.fullName || 'Nije dodeljen'}</span>
          </div>
        </div>
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Kreiran:</span>
            <span class="info-value">${serviceData.createdAt}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Zakazan:</span>
            <span class="info-value">${serviceData.scheduledDate || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Završen:</span>
            <span class="info-value">${serviceData.completedDate || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateTechnicianReportSection(serviceData: ServiceReportData): string {
  return `
    <div class="section">
      <div class="section-title">Opis Problema i Izvršenih Radova</div>
      <div class="notes-section">
        <div class="notes-title">Opis problema:</div>
        <div>${serviceData.description || 'Nije naveden opis problema.'}</div>
      </div>
      ${serviceData.technicianNotes ? `
        <div class="notes-section">
          <div class="notes-title">Napomene servisera:</div>
          <div>${serviceData.technicianNotes}</div>
        </div>
      ` : ''}
      ${serviceData.usedParts ? `
        <div class="notes-section">
          <div class="notes-title">Korišćeni delovi:</div>
          <div>${serviceData.usedParts}</div>
        </div>
      ` : ''}
      ${serviceData.machineNotes ? `
        <div class="notes-section">
          <div class="notes-title">Napomene o uređaju:</div>
          <div>${serviceData.machineNotes}</div>
        </div>
      ` : ''}
    </div>
  `;
}

function generateServiceTableSection(serviceData: ServiceReportData): string {
  const cost = serviceData.cost || '0';
  const isWarranty = serviceData.warrantyStatus === 'u garanciji';
  
  return `
    <div class="section">
      <div class="section-title">Pregled Usluge</div>
      <table class="service-table">
        <thead>
          <tr>
            <th>Usluga</th>
            <th>Garancija</th>
            <th>Količina</th>
            <th>Cena</th>
            <th>Rabat</th>
            <th>Porez</th>
            <th>Ukupno</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Servisna usluga - ${serviceData.appliance.category.name}</td>
            <td>${isWarranty ? 'DA' : 'NE'}</td>
            <td>1</td>
            <td>${isWarranty ? '0,00 RSD' : cost + ' RSD'}</td>
            <td>0%</td>
            <td>20%</td>
            <td><strong>${isWarranty ? '0,00 RSD' : cost + ' RSD'}</strong></td>
          </tr>
        </tbody>
      </table>
      <div style="text-align: right; margin-top: 15px; font-size: 14px;">
        <strong>Ukupno za naplatu: ${isWarranty ? '0,00 RSD' : cost + ' RSD'}</strong>
      </div>
    </div>
  `;
}

function generateSignatureSection(serviceData: ServiceReportData): string {
  return `
    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">Potpis servisera</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Potpis komitenta</div>
      </div>
    </div>
  `;
}

function generateGroupReportHeader(title: string, count: number): string {
  const currentDate = new Date().toLocaleDateString('sr-RS');
  
  return `
    <div class="header">
      <div class="company-info">
        <img src="${COMPANY_INFO.logo}" alt="Logo" class="company-logo" />
        <div class="company-name">${COMPANY_INFO.name}</div>
        <div class="company-details">
          ${COMPANY_INFO.address}<br>
          Tel: ${COMPANY_INFO.phone} | Email: ${COMPANY_INFO.email}<br>
          PIB: ${COMPANY_INFO.pib} | PDV: ${COMPANY_INFO.pdv}
        </div>
      </div>
      <div class="report-info">
        <strong>${title}</strong><br>
        Datum izdavanja: ${currentDate}<br>
        Ukupno servisa: ${count}<br>
        ${COMPANY_INFO.businessUnit}
      </div>
    </div>
    <div class="report-title">${title}</div>
  `;
}

function generateGroupReportSummary(services: ServiceReportData[]): string {
  const totalServices = services.length;
  const totalWarranty = services.filter(s => s.warrantyStatus === 'u garanciji').length;
  const totalPaid = services.filter(s => s.warrantyStatus === 'van garancije').length;
  
  return `
    <div class="section">
      <div class="section-title">Rezime Izveštaja</div>
      <div class="info-grid">
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Ukupno servisa:</span>
            <span class="info-value"><strong>${totalServices}</strong></span>
          </div>
          <div class="info-row">
            <span class="info-label">Garantni servisi:</span>
            <span class="info-value">${totalWarranty}</span>
          </div>
        </div>
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Plaćeni servisi:</span>
            <span class="info-value">${totalPaid}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Period:</span>
            <span class="info-value">${new Date().toLocaleDateString('sr-RS')}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateGroupServiceTable(services: ServiceReportData[], showProblems: boolean = false): string {
  const rows = services.map(service => `
    <tr>
      <td>#${service.id}</td>
      <td>${service.client.fullName}</td>
      <td>${service.appliance.manufacturer.name} ${service.appliance.category.name}</td>
      <td>${service.technician?.fullName || 'N/A'}</td>
      <td>${service.createdAt}</td>
      <td>${service.completedDate || 'N/A'}</td>
      <td>
        <span class="status-badge status-${getStatusClass(service.status)}">
          ${STATUS_TRANSLATIONS[service.status as keyof typeof STATUS_TRANSLATIONS] || service.status}
        </span>
      </td>
      <td>${service.warrantyStatus}</td>
      <td>${service.cost || '0'} RSD</td>
      ${showProblems ? `<td>${getProblematicReason(service)}</td>` : ''}
    </tr>
  `).join('');
  
  return `
    <div class="section">
      <div class="section-title">Detaljan Pregled Servisa</div>
      <table class="service-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Klijent</th>
            <th>Uređaj</th>
            <th>Serviser</th>
            <th>Kreiran</th>
            <th>Završen</th>
            <th>Status</th>
            <th>Garancija</th>
            <th>Cena</th>
            ${showProblems ? '<th>Problem</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function generateGroupReportFooter(): string {
  return `
    <div class="footer">
      <p>Izveštaj generisan automatski iz sistema ${COMPANY_INFO.name}</p>
      <p>Generisan: ${new Date().toLocaleString('sr-RS')} | ${COMPANY_INFO.businessUnit}</p>
    </div>
  `;
}

function generateFooter(): string {
  return `
    <div class="footer">
      <p>Hvala vam što ste odabrali ${COMPANY_INFO.name} za servisne usluge.</p>
      <p>Za sva pitanja kontaktirajte nas na ${COMPANY_INFO.phone} ili ${COMPANY_INFO.email}</p>
    </div>
  `;
}

// Utility functions

function getStatusClass(status: string): string {
  switch (status) {
    case 'completed':
    case 'delivered':
      return 'completed';
    case 'pending':
    case 'scheduled':
      return 'pending';
    case 'in_progress':
    case 'waiting_parts':
    case 'device_parts_removed':
      return 'in-progress';
    case 'cancelled':
    case 'client_not_home':
    case 'client_not_answering':
    case 'customer_refuses_repair':
    case 'customer_refused_repair':
    case 'repair_failed':
      return 'problematic';
    default:
      return 'pending';
  }
}

function getProblematicReason(service: ServiceReportData): string {
  if (service.needsRescheduling) return 'Potrebno novo zakazivanje';
  if (service.customerRefusesRepair) return 'Kupac odbija popravku';
  if (service.repairFailed) return 'Neuspešan servis';
  if (service.clientUnavailableReason) return service.clientUnavailableReason;
  if (service.status === 'client_not_home') return 'Klijent nije kući';
  if (service.status === 'client_not_answering') return 'Klijent se ne javlja';
  if (service.status === 'cancelled') return 'Servis otkazan';
  return 'Nepoznat problem';
}