// Test file for PDF generator functions
import { generateServiceReportPDF, ServiceReportData } from './pdf-report-generator.js';
import { writeFileSync } from 'fs';

// Mock test data for PDF generation test
const mockServiceData: ServiceReportData = {
  id: 1001,
  clientId: 1,
  applianceId: 1,
  technicianId: 1,
  description: 'Uređaj ne funkcioniše ispravno - ne hladi dovoljno, čuju se neobični zvukovi iz kompresora. Potrebna je detaljna dijagnostika rashladnog sistema.',
  status: 'completed',
  warrantyStatus: 'u garanciji',
  createdAt: '2024-12-01',
  scheduledDate: '2024-12-03',
  completedDate: '2024-12-05',
  technicianNotes: 'Izvršena je zamena defektnog termostata i čišćenje kondenzatora. Sistem sada radi besprekorno.',
  cost: '0',
  usedParts: 'Termostat TH-2000, čišćenje kondenzatora',
  machineNotes: 'Uređaj star 2 godine, redovno održavan. Garantni period važeći.',
  isCompletelyFixed: true,
  businessPartnerId: null,
  partnerCompanyName: null,
  clientUnavailableReason: null,
  needsRescheduling: false,
  reschedulingNotes: null,
  devicePickedUp: false,
  pickupDate: null,
  pickupNotes: null,
  customerRefusesRepair: false,
  customerRefusalReason: null,
  repairFailed: false,
  repairFailureReason: null,
  replacedPartsBeforeFailure: null,
  repairFailureDate: null,
  isWarrantyService: true,
  
  // Client data
  client: {
    id: 1,
    fullName: 'Marko Petrović',
    email: 'marko.petrovic@example.com',
    phone: '+381 11 123 4567',
    address: 'Knez Mihailova 15, stan 12',
    city: 'Beograd'
  },
  
  // Appliance data with category and manufacturer
  appliance: {
    id: 1,
    clientId: 1,
    categoryId: 1,
    manufacturerId: 1,
    model: 'RK-345X',
    serialNumber: 'BEKO2024001234',
    purchaseDate: '2022-11-15',
    notes: 'Premium model sa invertorskim kompresorom',
    category: {
      id: 1,
      name: 'Frižider',
      icon: 'refrigerator'
    },
    manufacturer: {
      id: 1,
      name: 'BEKO'
    }
  },
  
  // Technician data  
  technician: {
    id: 1,
    fullName: 'Nikola Stojanović',
    phone: '+381 64 987 6543',
    email: 'nikola.stojanovic@tehnoplus.rs',
    specialization: 'Hladni program',
    active: true
  }
};

// Test function to generate and save PDF
export async function testPDFGeneration() {
  try {
    console.log('🔄 Testiranje PDF generatora...');
    
    const pdfBuffer = await generateServiceReportPDF(mockServiceData);
    
    console.log('✅ PDF uspešno generisan!');
    console.log(`📄 Veličina PDF-a: ${pdfBuffer.length} bytes`);
    
    // Save test PDF to filesystem for manual verification
    writeFileSync('./test-service-report.pdf', pdfBuffer);
    console.log('💾 Test PDF sačuvan kao: test-service-report.pdf');
    
    return true;
  } catch (error) {
    console.error('❌ Greška pri generisanju PDF-a:', error);
    return false;
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPDFGeneration()
    .then(success => {
      if (success) {
        console.log('🎉 Test PDF generatora PROŠAO!');
        process.exit(0);
      } else {
        console.log('💥 Test PDF generatora NEUSPEŠAN!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Neočekivana greška:', error);
      process.exit(1);
    });
}