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
  totalServices?: number;
  totalClients?: number;
  totalParts?: number;
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

  static clientServiceStarted(data: SMSTemplateData): string {
    const message = `Poštovani ${data.clientName}, tehničar ${data.technicianName} je započeo rad na servisu #${data.serviceId} (${data.deviceType}). Tel: 067051141`;
    return this.validateSMSLength(message, 'client_service_started');
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
      case 'service_completed': return this.clientServiceCompleted(data);
      case 'service_started': return this.clientServiceStarted(data);
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
      
      // Servis Komerc templates (Beko services)
      case 'servis_zavrsen_beko': return this.servisKomercCompleted(data);
      case 'servis_komerc_dnevni': return this.servisKomercDaily(data);
      
      // NOVI SMS PROTOKOL templates - automatsko slanje
      case 'protocol_client_unavailable_to_client': return this.protocolClientUnavailableToClient(data);
      case 'protocol_client_unavailable_to_admin': return this.protocolClientUnavailableToAdmin(data);
      case 'protocol_client_unavailable_to_partner': return this.protocolClientUnavailableToPartner(data);
      
      case 'protocol_service_assigned_to_client': return this.protocolServiceAssignedToClient(data);
      case 'protocol_service_assigned_to_admin': return this.protocolServiceAssignedToAdmin(data);
      case 'protocol_service_assigned_to_partner': return this.protocolServiceAssignedToPartner(data);
      
      case 'protocol_parts_ordered_to_client': return this.protocolPartsOrderedToClient(data);
      case 'protocol_parts_ordered_to_admin': return this.protocolPartsOrderedToAdmin(data);
      case 'protocol_parts_ordered_to_partner': return this.protocolPartsOrderedToPartner(data);
      
      case 'protocol_repair_refused_to_client': return this.protocolRepairRefusedToClient(data);
      case 'protocol_repair_refused_to_admin': return this.protocolRepairRefusedToAdmin(data);
      case 'protocol_repair_refused_to_partner': return this.protocolRepairRefusedToPartner(data);
      
      case 'protocol_service_created_to_client': return this.protocolServiceCreatedToClient(data);
      case 'protocol_service_created_to_admin': return this.protocolServiceCreatedToAdmin(data);
      case 'protocol_service_created_to_partner': return this.protocolServiceCreatedToPartner(data);
      
      default:
        console.error(`⚠️ Nepoznat SMS template tip: ${type}`);
        return `Obaveštenje o servisu #${data.serviceId}. Tel: 067051141`;
    }
  }

  // Servis Komerc - Završen Beko servis
  private static servisKomercCompleted(data: SMSTemplateData): string {
    return `Pozdrav ${data.clientName}! Vaš ${data.deviceType} servis #${data.serviceId} je završen. Serviser: ${data.technicianName}. Trošak: ${data.cost}€. Hvala! - FS Todosijević`;
  }

  // Servis Komerc - Dnevni izveštaj  
  private static servisKomercDaily(data: SMSTemplateData): string {
    return `Servis Komerc dnevni izveštaj: ${data.totalServices || 0} Beko servisa, ${data.totalClients || 0} klijenata, ${data.totalParts || 0} delova. - FS Todosijević`;
  }

  // ========== NOVI SMS PROTOKOL TEMPLATES - AUTOMATSKO SLANJE ==========
  
  // PROTOKOL 1: Nedostupnost klijenta - Klijent template
  static protocolClientUnavailableToClient(data: SMSTemplateData): string {
    const message = `Pozdrav ${data.clientName}! Nismo Vas zatekli kod kuce za servis #${data.serviceId} (${data.deviceType}). Kontaktirajte 067051141 za novi termin. - Frigo Sistem`;
    return this.validateSMSLength(message, 'protocol_client_unavailable_to_client');
  }

  // PROTOKOL 1: Nedostupnost klijenta - Admin template
  static protocolClientUnavailableToAdmin(data: SMSTemplateData): string {
    const message = `NEDOSTUPAN KLIJENT - Servis #${data.serviceId}: ${data.clientName} (${data.clientPhone}), ${data.deviceType}, Tehnicar: ${data.technicianName}. Razlog: ${data.unavailableReason}`;
    return this.validateSMSLength(message, 'protocol_client_unavailable_to_admin');
  }

  // PROTOKOL 1: Nedostupnost klijenta - Partner template  
  static protocolClientUnavailableToPartner(data: SMSTemplateData): string {
    const message = `Klijent ${data.clientName} nedostupan za servis #${data.serviceId} (${data.deviceType}). Tehnicar: ${data.technicianName}. Potrebno novo zakazivanje. - Frigo Sistem`;
    return this.validateSMSLength(message, 'protocol_client_unavailable_to_partner');
  }

  // PROTOKOL 2: Dodela servisa - Klijent template
  static protocolServiceAssignedToClient(data: SMSTemplateData): string {
    const message = `Pozdrav ${data.clientName}! Vas servis #${data.serviceId} (${data.deviceType}) je dodeljen tehnicaru ${data.technicianName} (${data.technicianPhone}). - Frigo Sistem`;
    return this.validateSMSLength(message, 'protocol_service_assigned_to_client');
  }

  // PROTOKOL 2: Dodela servisa - Admin template
  static protocolServiceAssignedToAdmin(data: SMSTemplateData): string {
    const message = `DODELA - Servis #${data.serviceId} dodeljen: ${data.technicianName} za ${data.clientName} (${data.clientPhone}), ${data.deviceType}. Partner: ${data.businessPartnerName || 'N/A'}`;
    return this.validateSMSLength(message, 'protocol_service_assigned_to_admin');
  }

  // PROTOKOL 2: Dodela servisa - Partner template
  static protocolServiceAssignedToPartner(data: SMSTemplateData): string {
    const message = `Vas zahtev #${data.serviceId} za ${data.clientName} (${data.deviceType}) je dodeljen tehnicaru ${data.technicianName}. Mozete pratiti napredak. - Frigo Sistem`;
    return this.validateSMSLength(message, 'protocol_service_assigned_to_partner');
  }

  // PROTOKOL 3: Rezervni delovi - Klijent template
  static protocolPartsOrderedToClient(data: SMSTemplateData): string {
    const message = `Pozdrav ${data.clientName}! Porucen je rezervni deo ${data.partName} za Vas servis #${data.serviceId} (${data.deviceType}). Pristice za ${data.estimatedDate || '5-7 dana'}. - Frigo Sistem`;
    return this.validateSMSLength(message, 'protocol_parts_ordered_to_client');
  }

  // PROTOKOL 3: Rezervni delovi - Admin template
  static protocolPartsOrderedToAdmin(data: SMSTemplateData): string {
    const message = `PORUCEN DEO - ${data.partName} za servis #${data.serviceId}: ${data.clientName}, ${data.deviceType}, Tehnicar: ${data.technicianName}, Partner: ${data.businessPartnerName || 'N/A'}`;
    return this.validateSMSLength(message, 'protocol_parts_ordered_to_admin');
  }

  // PROTOKOL 3: Rezervni delovi - Partner template
  static protocolPartsOrderedToPartner(data: SMSTemplateData): string {
    const message = `Rezervni deo ${data.partName} je porucen za servis #${data.serviceId} (${data.clientName}, ${data.deviceType}). Pristice za ${data.estimatedDate || '5-7 dana'}. - Frigo Sistem`;
    return this.validateSMSLength(message, 'protocol_parts_ordered_to_partner');
  }

  // PROTOKOL 5: Odbijanje popravke - Klijent template
  static protocolRepairRefusedToClient(data: SMSTemplateData): string {
    const message = `Postovani ${data.clientName}, zabelezili smo da ne zelite popravku servisa #${data.serviceId} (${data.deviceType}). Kontakt: 067051141. - Frigo Sistem`;
    return this.validateSMSLength(message, 'protocol_repair_refused_to_client');
  }

  // PROTOKOL 5: Odbijanje popravke - Admin template
  static protocolRepairRefusedToAdmin(data: SMSTemplateData): string {
    const message = `ODBIO POPRAVKU - ${data.clientName} (${data.clientPhone}) odbio servis #${data.serviceId} (${data.deviceType}). Tehnicar: ${data.technicianName}`;
    return this.validateSMSLength(message, 'protocol_repair_refused_to_admin');
  }

  // PROTOKOL 5: Odbijanje popravke - Partner template
  static protocolRepairRefusedToPartner(data: SMSTemplateData): string {
    const message = `Klijent ${data.clientName} je odbio popravku za servis #${data.serviceId} (${data.deviceType}). Servis zatvoren. - Frigo Sistem`;
    return this.validateSMSLength(message, 'protocol_repair_refused_to_partner');
  }

  // PROTOKOL 6: Kreiranje servisa - Klijent template  
  static protocolServiceCreatedToClient(data: SMSTemplateData): string {
    const message = `Pozdrav ${data.clientName}! Kreiran je servis #${data.serviceId} za Vas ${data.deviceType}. Kontakticemo Vas za termin. Tel: 067051141 - Frigo Sistem`;
    return this.validateSMSLength(message, 'protocol_service_created_to_client');
  }

  // PROTOKOL 6: Kreiranje servisa - Admin template
  static protocolServiceCreatedToAdmin(data: SMSTemplateData): string {
    const message = `NOVI SERVIS #${data.serviceId} - ${data.clientName} (${data.clientPhone}), ${data.deviceType}, Kreirao: ${data.businessPartnerName || data.createdBy}`;
    return this.validateSMSLength(message, 'protocol_service_created_to_admin');
  }

  // PROTOKOL 6: Kreiranje servisa - Partner template
  static protocolServiceCreatedToPartner(data: SMSTemplateData): string {
    const message = `Potvrda: Kreiran servis #${data.serviceId} za ${data.clientName} (${data.deviceType}). Dodelit cemo tehnicara uskoro. - Frigo Sistem`;
    return this.validateSMSLength(message, 'protocol_service_created_to_partner');
  }
}