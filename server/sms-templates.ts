// OPTIMIZOVANI SMS TEMPLATE SISTEM - JEDNODELNE PORUKE SAMO!
// Maksimum 160 karaktera GSM-7 encoding za garantovanu dostavu kroz SMS Mobile API

export interface SMSTemplateData {
  clientName?: string;
  clientPhone?: string;
  serviceId?: string;
  technicianName?: string;
  technicianPhone?: string;
  deviceType?: string;
  deviceModel?: string;
  manufacturerName?: string;
  problemDescription?: string;
  partName?: string;
  quantity?: string;
  estimatedDate?: string;
  actualDate?: string;
  cost?: string;
  businessPartnerName?: string;
  supplierName?: string;
  deliveryTime?: string;
  statusDescription?: string;
  technicianNotes?: string;
  createdBy?: string;
  oldStatus?: string;
  newStatus?: string;
  assignedBy?: string;
  orderedBy?: string;
  urgency?: string;
  adminName?: string;
  companyPhone?: string;
  partnerName?: string;
  unavailableType?: string;
  reschedulingNotes?: string;
  unavailableReason?: string;
}

export class SMSTemplates {
  // KRITIČNO: Sve poruke MORAJU da stanu u 160 karaktera za jednodelnu dostavu
  private static validateSMSLength(message: string, templateName: string): string {
    // Uklanja sve problematične karaktere koji mogu aktivirati Unicode
    const cleanMessage = message
      .replace(/[""'']/g, '"') // Smart quotes -> straight quotes
      .replace(/[—–]/g, '-')   // Em/en dash -> hyphen  
      .replace(/[…]/g, '...')  // Ellipsis -> dots
      .replace(/\r?\n\s*\r?\n/g, ' ') // Dupli novi red -> jedan space
      .replace(/\r?\n/g, ' ')  // Novi red -> space
      .replace(/\s{2,}/g, ' ') // Višestruki space -> jedan space
      .trim();

    if (cleanMessage.length > 160) {
      console.log(`⚠️ SMS ${templateName}: ${cleanMessage.length} karaktera -> potrebno skraćivanje`);
      
      // INTELIGENTNO SKRAĆIVANJE UMESTO OBIČNOG ODSECANJA
      let shortenedMessage = cleanMessage;
      
      // 1. Skrati duga imena zadržavajući prezime
      shortenedMessage = shortenedMessage.replace(/(\w+)\s+(\w{2,})\s+(\w+)/g, (match, ime, srednje, prezime) => {
        if (match.length > 15) { // Ako je puno ime duže od 15 karaktera
          return `${ime.charAt(0)}. ${prezime}`; // "Ljubo Sekulić" -> "L. Sekulić"
        }
        return match;
      });
      
      // 2. Skrati model i manufacturer informacije
      shortenedMessage = shortenedMessage.replace(/Model:\s+([^\s,]+)[^\s,]*/g, 'Model: $1');
      shortenedMessage = shortenedMessage.replace(/\s+\([^)]{10,}\)/g, ''); // Ukloni dugačke zagrade
      
      // 3. Skrati reči čestih fraza, ali pametno
      shortenedMessage = shortenedMessage
        .replace(/Tehničar:/g, 'Teh:')
        .replace(/Klijent:/g, 'Kl:')
        .replace(/Servis/g, 'Srv')
        .replace(/promenjeno:/g, '->')
        .replace(/uspešno završen/g, 'završen')
        .replace(/Tel: 067051141/g, 'T:067051141')
        .replace(/Hvala na saradnji!/g, 'Hvala!')
        .replace(/kontaktirati/g, 'kontakt.')
        .replace(/Pristice za/g, 'za')
        .replace(/dana(?=\s)/g, 'd') // Samo ako prati space
        .replace(/testiranje/g, 'test')
        .replace(/kalibracija/g, 'kalibr')
        .replace(/kompletno/g, 'kompl')
        .replace(/potpuno/g, 'potp')
        .replace(/izvršeno/g, 'izvrš')
        .replace(/detaljnim/g, 'detalj')
        .replace(/sistema/g, 'sist')
        .replace(/Zamenjen/g, 'Zamen');
      
      // 4. Ako i dalje predugačko, odseci na 157 + "..."
      if (shortenedMessage.length > 160) {
        shortenedMessage = shortenedMessage.substring(0, 157) + '...';
      }
      
      console.log(`🔧 SMS ${templateName}: ${cleanMessage.length} -> ${shortenedMessage.length} karaktera`);
      return shortenedMessage;
    }
    
    console.log(`✅ SMS ${templateName}: ${cleanMessage.length} karaktera (JEDNODELNA PORUKA)`);
    return cleanMessage;
  }

  // ADMINISTRATORSKI SMS OBAVEŠTENJA (KOMPAKTNI FORMAT)
  
  static adminStatusChange(data: SMSTemplateData): string {
    const message = `PROMENA - Servis #${data.serviceId}: ${data.clientName} (${data.clientPhone}), ${data.deviceType} ${data.manufacturerName || ''}, ${data.oldStatus}->${data.newStatus}, Tehnicar: ${data.technicianName}`;
    return this.validateSMSLength(message, 'admin_status_change');
  }

  static adminNewService(data: SMSTemplateData): string {
    const message = `NOVI SERVIS #${data.serviceId} - ${data.clientName} (${data.clientPhone}), ${data.deviceType} ${data.manufacturerName || ''}, Model: ${data.deviceModel || 'N/A'}, Kreirao: ${data.createdBy || 'Upravljanje'}`;
    return this.validateSMSLength(message, 'admin_new_service');
  }

  static adminTechnicianAssigned(data: SMSTemplateData): string {
    const message = `DODELJEN - ${data.technicianName} (${data.technicianPhone || 'N/A'}) za servis #${data.serviceId}: ${data.clientName} (${data.clientPhone}), ${data.deviceType} ${data.manufacturerName || ''}`;
    return this.validateSMSLength(message, 'admin_technician_assigned');
  }

  static adminPartsOrdered(data: SMSTemplateData): string {
    const urgencyText = data.urgency === 'urgent' ? '[HITNO] ' : data.urgency === 'high' ? '[BRZO] ' : '';
    const message = `${urgencyText}PORUCEN DEO - ${data.partName} za servis #${data.serviceId}: ${data.clientName}, ${data.deviceType}, Tehnicar: ${data.technicianName}, Vreme: ${data.estimatedDate || '5-7d'}`;
    return this.validateSMSLength(message, 'admin_parts_ordered');
  }

  static adminPartsArrived(data: SMSTemplateData): string {
    const message = `STIGAO DEO - Servis #${data.serviceId}, Deo: ${data.partName}, Klijent: ${data.clientName}, Tehnicar: ${data.technicianName}. Moze ugradnja.`;
    return this.validateSMSLength(message, 'admin_parts_arrived');
  }

  static adminRemovedParts(data: SMSTemplateData): string {
    const message = `UKLONJENI DELOVI - Servis #${data.serviceId}, Tehnicar: ${data.technicianName}, Klijent: ${data.clientName}, Uredjaj: ${data.deviceType}`;
    return this.validateSMSLength(message, 'admin_removed_parts');
  }

  static adminClientUnavailable(data: SMSTemplateData): string {
    const message = `KLIJENT NEDOSTUPAN - Servis #${data.serviceId}, Tehnicar: ${data.technicianName}, Klijent: ${data.clientName || 'Nepoznat klijent'}, Uredjaj: ${data.deviceType || 'Nepoznat uredjaj'}`;
    return this.validateSMSLength(message, 'admin_klijent_nije_dostupan');
  }

  // KLIJENTSKI SMS OBAVEŠTENJA (KRATKI FORMAT)

  static clientServiceCompleted(data: SMSTemplateData): string {
    const costInfo = data.cost && parseFloat(data.cost) > 0 ? `, cena: ${data.cost}€` : '';
    const message = `Servis #${data.serviceId} za ${data.deviceType} ${data.manufacturerName || ''} uspešno završen. Tehnicar: ${data.technicianName}${costInfo}. Hvala! Tel: 067051141`;
    return this.validateSMSLength(message, 'client_service_completed');
  }

  static clientNotAvailable(data: SMSTemplateData): string {
    const message = `Tehničar ${data.technicianName} pokušava kontakt za servis #${data.serviceId}. Pozovite 067051141 za novi termin.`;
    return this.validateSMSLength(message, 'client_not_available');
  }

  static clientSparePartOrdered(data: SMSTemplateData): string {
    const urgencyText = data.urgency === 'urgent' ? ' HITNO' : data.urgency === 'high' ? ' BRZO' : '';
    const message = `Porucen deo "${data.partName}" za vas ${data.deviceType} ${data.manufacturerName || ''}${urgencyText}. Pristice za ${data.estimatedDate || '5-7 dana'}. Tel: 067051141`;
    return this.validateSMSLength(message, 'client_spare_part_ordered');
  }

  static clientSparePartArrived(data: SMSTemplateData): string {
    const message = `Deo ${data.partName} za servis #${data.serviceId} je stigao. Tehničar ce vas kontaktirati u 24h. Tel: 067051141`;
    return this.validateSMSLength(message, 'client_spare_part_arrived');
  }

  static clientServiceStatusChanged(data: SMSTemplateData): string {
    const message = `Stanje servisa #${data.serviceId} promenjeno: ${data.newStatus}. Tehničar: ${data.technicianName}. Tel: 067051141`;
    return this.validateSMSLength(message, 'client_service_status_changed');
  }

  static clientStatusUpdate(data: SMSTemplateData): string {
    // Kratka poruka za status update-e - optimizovano za imena kao "Ljubo Sekulić"
    const notes = data.technicianNotes ? ` - ${data.technicianNotes}` : '';
    const message = `Srv #${data.serviceId}: ${data.statusDescription}. Teh: ${data.technicianName}${notes}. T:067051141`;
    return this.validateSMSLength(message, 'client_status_update');
  }

  // POSLOVNI PARTNERI SMS OBAVEŠTENJA (KRATKI FORMAT)

  static businessPartnerAssigned(data: SMSTemplateData): string {
    const message = `DODELJEN - Servis #${data.serviceId}: ${data.clientName} (${data.clientPhone}), ${data.deviceType} ${data.manufacturerName || ''}, Tehnicar: ${data.technicianName} (${data.technicianPhone || 'N/A'})`;
    return this.validateSMSLength(message, 'business_partner_assigned');
  }

  static businessPartnerCompleted(data: SMSTemplateData): string {
    const message = `Servis #${data.serviceId} za ${data.clientName} (${data.deviceType}) je završen. Tehničar: ${data.technicianName}. Hvala na saradnji!`;
    return this.validateSMSLength(message, 'business_partner_completed');
  }

  static businessPartnerServiceCompleted(data: SMSTemplateData): string {
    const message = `Servis #${data.serviceId} - ${data.clientName} (${data.deviceType}) završen. Tehničar: ${data.technicianName}. Hvala na saradnji!`;
    return this.validateSMSLength(message, 'business_partner_service_completed');
  }

  static businessPartnerPartsOrdered(data: SMSTemplateData): string {
    const message = `Porucen deo ${data.partName} za servis #${data.serviceId} (${data.clientName}, ${data.deviceType}). Pristice za ${data.estimatedDate || '5-7 dana'}.`;
    return this.validateSMSLength(message, 'business_partner_parts_ordered');
  }

  static businessPartnerStatusChanged(data: SMSTemplateData): string {
    const message = `Stanje servisa #${data.serviceId} promenjeno: ${data.oldStatus} -> ${data.newStatus}. Klijent: ${data.clientName}, Tehničar: ${data.technicianName}.`;
    return this.validateSMSLength(message, 'business_partner_status_changed');
  }

  // TEHNIČKI SMS OBAVEŠTENJA (KRATKI FORMAT)

  static technicianNewService(data: SMSTemplateData): string {
    const message = `NOVI SERVIS #${data.serviceId} - ${data.clientName} (${data.clientPhone}), ${data.deviceType} ${data.manufacturerName || ''}, Model: ${data.deviceModel || 'N/A'}. Problem: ${data.problemDescription || 'Proveri sistem'}`;
    return this.validateSMSLength(message, 'technician_new_service');
  }

  static technicianPartArrived(data: SMSTemplateData): string {
    const message = `Stigao deo ${data.partName} za servis #${data.serviceId}. Klijent: ${data.clientName}. Možete ugrađivati.`;
    return this.validateSMSLength(message, 'technician_part_arrived');
  }

  // DOBAVLJAČ SMS OBAVEŠTENJA (Beli - Complus brendovi)
  
  static supplierStatusChanged(data: SMSTemplateData): string {
    const message = `${data.manufacturerName} servis #${data.serviceId} - ${data.clientName}, Stanje: ${data.oldStatus} -> ${data.newStatus}, Tehničar: ${data.technicianName}`;
    return this.validateSMSLength(message, 'supplier_status_changed');
  }

  static supplierPartsOrdered(data: SMSTemplateData): string {
    const urgencyText = data.urgency === 'urgent' ? 'HITNO' : data.urgency === 'high' ? 'BRZO' : '';
    const message = `${urgencyText} Deo poručen za ${data.manufacturerName} servis #${data.serviceId}. Klijent: ${data.clientName}, Deo: ${data.partName}, Naručio: ${data.orderedBy}`;
    return this.validateSMSLength(message, 'supplier_parts_ordered');
  }

  // DELOVI DODELJENI TEHNIČARIMA
  static clientPartsAllocated(data: SMSTemplateData): string {
    const message = `Deo ${data.partName} (${data.quantity || '1'} kom) dodeljen tehničaru ${data.technicianName} za vas uredjaj. Servis #${data.serviceId}`;
    return this.validateSMSLength(message, 'client_parts_allocated');
  }

  static adminPartsAllocated(data: SMSTemplateData): string {
    const message = `UPRAVLJANJE: Deo ${data.partName} (${data.quantity || '1'} kom) dodeljen ${data.technicianName} za servis #${data.serviceId} - ${data.clientName}`;
    return this.validateSMSLength(message, 'admin_parts_allocated');
  }

  static businessPartnerPartsAllocated(data: SMSTemplateData): string {
    const message = `Deo ${data.partName} (${data.quantity || '1'} kom) dodeljen za servis #${data.serviceId} - ${data.clientName}. Tehničar: ${data.technicianName}`;
    return this.validateSMSLength(message, 'business_partner_parts_allocated');
  }

  // GLAVNI GENERATOR SMS PORUKA
  static generateSMS(type: string, data: SMSTemplateData): string {
    switch (type) {
      // Admin templates
      case 'admin_status_change': return this.adminStatusChange(data);
      case 'admin_new_service': return this.adminNewService(data);
      case 'admin_technician_assigned': return this.adminTechnicianAssigned(data);
      case 'admin_parts_ordered': return this.adminPartsOrdered(data);
      case 'admin_parts_arrived': return this.adminPartsArrived(data);
      case 'admin_removed_parts': return this.adminRemovedParts(data);
      case 'admin_klijent_nije_dostupan': return this.adminClientUnavailable(data);
      
      // Client templates
      case 'client_service_completed': return this.clientServiceCompleted(data);
      case 'client_not_available': return this.clientNotAvailable(data);
      case 'klijent_nije_dostupan': return this.clientNotAvailable(data);
      case 'client_spare_part_ordered': return this.clientSparePartOrdered(data);
      case 'client_spare_part_arrived': return this.clientSparePartArrived(data);
      case 'service_status_changed': return this.clientServiceStatusChanged(data);
      case 'client_status_update': return this.clientStatusUpdate(data);
      
      // Business partner templates
      case 'business_partner_assigned': return this.businessPartnerAssigned(data);
      case 'business_partner_completed': return this.businessPartnerCompleted(data);
      case 'business_partner_service_completed': return this.businessPartnerServiceCompleted(data);
      case 'business_partner_parts_ordered': return this.businessPartnerPartsOrdered(data);
      case 'business_partner_status_changed': return this.businessPartnerStatusChanged(data);
      
      // Technician templates  
      case 'technician_new_service': return this.technicianNewService(data);
      case 'technician_part_arrived': return this.technicianPartArrived(data);
      
      // Supplier templates
      case 'supplier_status_changed': return this.supplierStatusChanged(data);
      case 'supplier_parts_ordered': return this.supplierPartsOrdered(data);
      
      // Parts allocation templates
      case 'client_parts_allocated': return this.clientPartsAllocated(data);
      case 'admin_parts_allocated': return this.adminPartsAllocated(data);
      case 'business_partner_parts_allocated': return this.businessPartnerPartsAllocated(data);
      
      default:
        console.error(`⚠️ Nepoznat SMS template tip: ${type}`);
        return `Obaveštenje o servisu #${data.serviceId}. Tel: 067051141`;
    }
  }
}