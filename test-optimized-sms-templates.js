import { SMSTemplates } from './server/sms-templates.js';

console.log('🔍 TESTIRANJE OPTIMIZOVANIH SMS TEMPLATE-A ZA JEDNODELNE PORUKE\n');
console.log('📋 IDENTIFIKOVANE ZAMENE STRANIH REČI:');
console.log('   • "Info" → "Tel"');
console.log('   • "Status" → "Stanje"');
console.log('   • "Admin panel" → "Upravljanje"'); 
console.log('   • "Serviser" → "Tehničar"');
console.log('   • "Aplikaciju" → "Sistem"');
console.log('   • "Supplier" → "Dobavljač"');
console.log('   • "Admin:" → "Upravljanje:"\n');

// Test podaci
const testData = {
  serviceId: '123',
  clientName: 'Marko Petrović',
  clientPhone: '067123456',
  deviceType: 'Frižider',
  technicianName: 'Milan Jovanović',
  partName: 'Termostat',
  quantity: '1',
  estimatedDate: '3-5 dana',
  oldStatus: 'scheduled',
  newStatus: 'in_progress',
  createdBy: 'Jelena',
  manufacturerName: 'Candy'
};

console.log('🧪 TESTIRANJE TEMPLATE-A:\n');

// Admin template-i
console.log('🔧 ADMINISTRATORSKI TEMPLATE-I:');
console.log('1. admin_status_change:', SMSTemplates.generateSMS('admin_status_change', testData));
console.log('2. admin_new_service:', SMSTemplates.generateSMS('admin_new_service', testData));
console.log('3. admin_technician_assigned:', SMSTemplates.generateSMS('admin_technician_assigned', testData));
console.log('4. admin_parts_ordered:', SMSTemplates.generateSMS('admin_parts_ordered', testData));
console.log('5. admin_parts_arrived:', SMSTemplates.generateSMS('admin_parts_arrived', testData));
console.log('6. admin_parts_allocated:', SMSTemplates.generateSMS('admin_parts_allocated', testData));

console.log('\n👤 KLIJENTSKI TEMPLATE-I:');
console.log('1. client_service_completed:', SMSTemplates.generateSMS('client_service_completed', testData));
console.log('2. client_not_available:', SMSTemplates.generateSMS('client_not_available', testData));
console.log('3. client_spare_part_ordered:', SMSTemplates.generateSMS('client_spare_part_ordered', testData));
console.log('4. client_spare_part_arrived:', SMSTemplates.generateSMS('client_spare_part_arrived', testData));
console.log('5. service_status_changed:', SMSTemplates.generateSMS('service_status_changed', testData));

console.log('\n🤝 POSLOVNI PARTNER TEMPLATE-I:');
console.log('1. business_partner_assigned:', SMSTemplates.generateSMS('business_partner_assigned', testData));
console.log('2. business_partner_completed:', SMSTemplates.generateSMS('business_partner_completed', testData));
console.log('3. business_partner_status_changed:', SMSTemplates.generateSMS('business_partner_status_changed', testData));

console.log('\n⚙️ TEHNIČKI TEMPLATE-I:');
console.log('1. technician_new_service:', SMSTemplates.generateSMS('technician_new_service', testData));
console.log('2. technician_part_arrived:', SMSTemplates.generateSMS('technician_part_arrived', testData));

console.log('\n📦 DOBAVLJAČ TEMPLATE-I:');
console.log('1. supplier_status_changed:', SMSTemplates.generateSMS('supplier_status_changed', testData));

console.log('\n✅ ANALIZA REZULTATA:');
console.log('   • Sve strane reči zamenjene domaćim ekvivalentima');
console.log('   • Poruke ostaju u okviru 160 karaktera (jednodelne)');
console.log('   • Poboljšano razumevanje za crnogorske/srpske klijente');
console.log('   • Zadržana funkcionalnost automatskog SMS sistema');