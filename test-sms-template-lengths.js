// Test script za proveru dužine SMS template-a
import { SMSTemplates } from './server/sms-templates.ts';

// Mock podaci za testiranje
const testData = {
  clientName: 'Marko Petrović',
  serviceId: '123',
  technicianName: 'Gruica Todosijević',
  deviceType: 'Frižider Samsung',
  partName: 'Kompresor XYZ-123',
  businessPartnerName: 'Robert Ivezić',
  adminName: 'Administrator',
  statusDescription: 'Servis u toku',
  technicianNotes: 'Potrebna zamena delova',
  supplierName: 'Complus',
  estimatedDate: '5-7 dana',
  urgency: 'normal'
};

console.log('🔍 TESTIRANJE DUŽINE SMS TEMPLATE-A');
console.log('=====================================');
console.log('📏 Maksimalno dozvoljeno: 160 karaktera');
console.log('');

// Lista template-a za testiranje
const templates = [
  'service_completed',
  'client_not_available', 
  'spare_part_arrived',
  'spare_part_ordered',
  'business_partner_technician_assigned',
  'business_partner_status_update', 
  'business_partner_spare_part_ordered',
  'client_part_ordered_by_technician',
  'client_not_available_by_technician',
  'admin_parts_removed_by_technician',
  'admin_part_ordered_by_technician',
  'admin_client_not_available_by_technician'
];

let longTemplates = 0;
let totalTemplates = 0;

templates.forEach(templateType => {
  try {
    const message = SMSTemplates.generateSMS(templateType, testData);
    const length = message.length;
    totalTemplates++;
    
    const status = length > 160 ? '❌ PREDUGAČAK' : '✅ OK';
    const warning = length > 160 ? ` (PREVIŠE ${length - 160} karaktera)` : '';
    
    console.log(`${status} ${templateType}: ${length} karaktera${warning}`);
    
    if (length > 160) {
      longTemplates++;
      console.log(`   Sadržaj: ${message.substring(0, 100)}...`);
    }
    
  } catch (error) {
    console.log(`⚠️  ${templateType}: GREŠKA - ${error.message}`);
  }
});

console.log('');
console.log('📊 REZULTAT:');
console.log(`✅ Kraći od 160 karaktera: ${totalTemplates - longTemplates}/${totalTemplates}`);
console.log(`❌ Duži od 160 karaktera: ${longTemplates}/${totalTemplates}`);

if (longTemplates === 0) {
  console.log('🎉 SVI TEMPLATE-I SU OPTIMIZOVANI!');
} else {
  console.log('⚠️  Potrebno je skratiti predugačke template-e');
}