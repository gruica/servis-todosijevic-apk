// SMS Template sistem za automatsku komunikaciju sa klijentima, poslovnim partnerima i servisima

export interface SMSTemplateData {
  clientName?: string;
  clientPhone?: string;
  serviceId?: string;
  technicianName?: string;
  technicianPhone?: string;
  deviceType?: string;
  deviceModel?: string;
  problemDescription?: string;
  partName?: string;
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
  private static COMPANY_NAME = "Frigo Sistem Todosijević";
  private static CONTACT_PHONE = "069/xxx-xxx";
  private static CONTACT_EMAIL = "info@frigosistemtodosijevic.com";

  // KLIJENT SMS OBAVEŠTENJA
  
  /**
   * SMS za klijenta nakon završetka servisa
   */
  static serviceCompleted(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Vaš servis #${data.serviceId} za ${data.deviceType} je uspešno završen od strane naših stručnjaka. 

Hvala Vam što ste izabrali ${this.COMPANY_NAME}. Vaše zadovoljstvo je naš prioritet.

Za sva pitanja: ${this.CONTACT_PHONE}`;
  }

  /**
   * SMS za klijenta kada se serviser ne javlja ili nije dostupan
   */
  static clientNotAvailable(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Naš serviser ${data.technicianName} je pokušao da Vas kontaktira u vezi servisa #${data.serviceId} za ${data.deviceType}, ali se niste javili.

Molimo Vas da nas kontaktirate na ${this.CONTACT_PHONE} radi dogovaranja novog termina.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS za klijenta kada serviser ne može da ga kontaktira
   */
  static clientNoAnswer(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Vaš serviser ${data.technicianName} pokušava da Vas kontaktira u vezi servisa #${data.serviceId}.

Molimo pozovite nas na ${this.CONTACT_PHONE} ili odgovorite na ovaj SMS da dogovorimo termin za ${data.deviceType}.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS obaveštenje o prispeću rezervnog dela
   */
  static sparePartArrived(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Rezervni deo "${data.partName}" za Vaš ${data.deviceType} (servis #${data.serviceId}) je stigao.

Naš serviser će Vas kontaktirati u naredna 24h radi dogovaranja termina za ugradnju.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS obaveštenje o poručivanju rezervnog dela
   */
  static sparePartOrdered(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Za Vaš ${data.deviceType} (servis #${data.serviceId}) je poručen potreban rezervni deo "${data.partName}".

Očekivano vreme prispeća: ${data.estimatedDate || '5-7 radnih dana'}.

Kontakt: ${this.CONTACT_PHONE}

${this.COMPANY_NAME}`;
  }

  // POSLOVNI PARTNER SMS OBAVEŠTENJA

  /**
   * SMS za poslovnog partnera o dodeli servisa
   */
  static businessPartnerAssigned(data: SMSTemplateData): string {
    return `Poštovani ${data.partnerName || data.businessPartnerName},

Servis #${data.serviceId} za klijenta ${data.clientName} (${data.deviceType}) je dodeljen tehniciaru ${data.technicianName}. 

Status možete pratiti u admin panelu.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS za poslovnog partnera o završetku servisa
   */
  static businessPartnerCompleted(data: SMSTemplateData): string {
    return `Poštovani ${data.partnerName || data.businessPartnerName},

Servis #${data.serviceId} za Vašeg klijenta ${data.clientName} (${data.deviceType}) je uspešno završen.

Tehničar ${data.technicianName} je završio popravku.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS za poslovnog partnera nakon preuzimanja servisa
   */
  static serviceAssignedToPartner(data: SMSTemplateData): string {
    return `Poštovani ${data.businessPartnerName},

Servis #${data.serviceId} je dodeljen Vašoj firmi.

Klijent: ${data.clientName}
Uređaj: ${data.deviceType} ${data.deviceModel || ''}
Problem: ${data.problemDescription}
Serviser: ${data.technicianName}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS za poslovnog partnera o poručivanju dela
   */
  static partOrderedByPartner(data: SMSTemplateData): string {
    return `Poštovani ${data.businessPartnerName},

Za servis #${data.serviceId} kod ${data.supplierName} je poručen deo "${data.partName}".

Klijent: ${data.clientName}
Uređaj: ${data.deviceType}

${this.COMPANY_NAME}`;
  }

  // KORISNICI - AUTOMATSKI SMS TRIGGERI

  /**
   * SMS korisniku pri promjeni statusa servisa
   */
  static clientStatusUpdate(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Status Vašeg servisa #${data.serviceId} (${data.deviceType}) je ažuriran na: ${data.statusDescription}.

${data.technicianNotes ? `Napomena: ${data.technicianNotes}` : ''}

Za dodatne informacije: ${this.CONTACT_PHONE}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS korisniku kada se poruči rezervni dio
   */
  static clientSparePartOrdered(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Za Vaš ${data.deviceType} (servis #${data.serviceId}) je poručen rezervni dio "${data.partName}".

Očekivano vreme prispeća: ${data.estimatedDate || '5-7 radnih dana'}.

Kontakt: ${this.CONTACT_PHONE}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS korisniku kada rezervni dio stigne
   */
  static clientSparePartArrived(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Rezervni dio "${data.partName}" za Vaš ${data.deviceType} (servis #${data.serviceId}) je stigao u magacin.

Naš serviser će Vas kontaktirati u naredna 24h radi ugradnje.

Hvala na strpljenju!

${this.COMPANY_NAME}`;
  }

  // POSLOVNI PARTNERI - AUTOMATSKI SMS TRIGGERI

  /**
   * SMS poslovnom partneru pri dodeli tehnčara
   */
  static businessPartnerTechnicianAssigned(data: SMSTemplateData): string {
    return `Poštovani ${data.businessPartnerName},

Servis #${data.serviceId} za Vašeg klijenta ${data.clientName} (${data.deviceType}) je dodeljen serviseru ${data.technicianName}.

Status možete pratiti kroz portal.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS poslovnom partneru pri promjeni statusa
   */
  static businessPartnerStatusUpdate(data: SMSTemplateData): string {
    return `Poštovani ${data.businessPartnerName},

Ažuriran je status servisa #${data.serviceId} za klijenta ${data.clientName} (${data.deviceType}).

Novi status: ${data.statusDescription}

${data.technicianNotes ? `Napomena: ${data.technicianNotes}` : ''}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS poslovnom partneru kada se poruči rezervni dio
   */
  static businessPartnerSparePartOrdered(data: SMSTemplateData): string {
    return `Poštovani ${data.businessPartnerName},

Za servis #${data.serviceId} (klijent: ${data.clientName}, ${data.deviceType}) je poručen rezervni dio "${data.partName}".

Dobavljač: ${data.supplierName || 'Standard'}
Očekivano: ${data.estimatedDate || '5-7 dana'}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS za poslovnog partnera nakon završetka servisa
   */
  static partnerServiceCompleted(data: SMSTemplateData): string {
    return `Poštovani ${data.businessPartnerName},

Servis #${data.serviceId} je uspešno završen.

Klijent: ${data.clientName}
Uređaj: ${data.deviceType}
Serviser: ${data.technicianName}
Troškovi: ${data.cost || 'Prema ugovoru'}

Hvala na saradnji.

${this.COMPANY_NAME}`;
  }

  // SERVISER SMS OBAVEŠTENJA

  /**
   * SMS za servisera o prispeću rezervnog dela
   */
  static technicianPartArrived(data: SMSTemplateData): string {
    return `${data.technicianName},

Rezervni deo "${data.partName}" za servis #${data.serviceId} je stigao.

Klijent: ${data.clientName}
Uređaj: ${data.deviceType}

Možete pristupiti ugradnji.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS za servisera o novom servisu
   */
  static newServiceAssigned(data: SMSTemplateData): string {
    return `${data.technicianName},

Dodeljen Vam je novi servis #${data.serviceId}.

Klijent: ${data.clientName}
Uređaj: ${data.deviceType} ${data.deviceModel || ''}
Problem: ${data.problemDescription}

Proverite aplikaciju za detalje.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS za servisera o statusu rezervnog dela
   */
  static partStatusUpdate(data: SMSTemplateData): string {
    return `${data.technicianName},

Rezervni deo "${data.partName}" za servis #${data.serviceId}:

Status: Poručen od ${data.supplierName}
Očekivano: ${data.estimatedDate || '5-7 radnih dana'}

Klijent: ${data.clientName}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS klijentu kad se poruče rezervni dijelovi
   */
  static clientPartsOrdered(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Za Vaš ${data.deviceType} (servis #${data.serviceId}) je poručen rezervni dio "${data.partName}".

Očekivano vreme isporuke: ${data.deliveryTime || '7-10 dana'}

Kontaktiraćemo Vas kada dio stigne.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS poslovnom partneru kad se poruče rezervni dijelovi za njihov servis
   */
  static businessPartnerPartsOrdered(data: SMSTemplateData): string {
    return `Poštovani ${data.businessPartnerName},

Za servis #${data.serviceId} koji ste Vi zakazali je poručen rezervni dio "${data.partName}".

Klijent: ${data.clientName}
Uređaj: ${data.deviceType}
Isporuka: ${data.deliveryTime || '7-10 dana'}

Obavijestićemo Vas kada dio stigne.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS poslovnom partneru kad stigugu rezervni dijelovi za njihov servis
   */
  static businessPartnerPartsArrived(data: SMSTemplateData): string {
    return `Poštovani ${data.businessPartnerName},

Rezervni dio "${data.partName}" za Vaš servis #${data.serviceId} je stigao.

Klijent: ${data.clientName}
Uređaj: ${data.deviceType}

Servis će uskoro biti završen.

${this.COMPANY_NAME}`;
  }

  // ===== ADMIN SMS TEMPLATE-I =====

  /**
   * SMS administratoru o novom servisu
   */
  static adminNewService(data: SMSTemplateData): string {
    return `${data.adminName || 'Administratore'},

NOVI SERVIS #${data.serviceId}

Klijent: ${data.clientName}
Uređaj: ${data.deviceType}
Kreirao: ${data.createdBy}

${data.problemDescription ? `Problem: ${data.problemDescription}` : ''}

Zahteva Vašu pažnju.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS administratoru o promeni statusa servisa
   */
  static adminStatusChange(data: SMSTemplateData): string {
    return `${data.adminName || 'Administratore'},

PROMENA STATUSA - Servis #${data.serviceId}

Klijent: ${data.clientName}
Uređaj: ${data.deviceType}
Status: ${data.oldStatus} → ${data.newStatus}
${data.technicianName ? `Serviser: ${data.technicianName}` : ''}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS administratoru o dodeli tehničara
   */
  static adminTechnicianAssigned(data: SMSTemplateData): string {
    return `${data.adminName || 'Administratore'},

DODELJEN SERVISER - Servis #${data.serviceId}

Klijent: ${data.clientName}
Uređaj: ${data.deviceType}
Serviser: ${data.technicianName}
Dodelio: ${data.assignedBy}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS administratoru o porudžbini rezervnih delova
   */
  static adminPartsOrdered(data: SMSTemplateData): string {
    const urgencyText = data.urgency === 'urgent' ? ' - HITNO!' : '';
    
    return `${data.adminName || 'Administratore'},

PORUDŽBINA DELOVA${urgencyText} - Servis #${data.serviceId}

Klijent: ${data.clientName}
Uređaj: ${data.deviceType}
Deo: ${data.partName}
Poručio: ${data.orderedBy}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS administratoru o prispeću rezervnih delova
   */
  static adminPartsArrived(data: SMSTemplateData): string {
    return `${data.adminName || 'Administratore'},

STIGLI DELOVI - Servis #${data.serviceId}

Klijent: ${data.clientName}
Uređaj: ${data.deviceType}
Deo: ${data.partName}

Servis može biti nastavljen.

${this.COMPANY_NAME}`;
  }

  // TEHNIČKE AKCIJE - SMS TEMPLATE-I ZA KLIJENTE I ADMINISTRATORE

  /**
   * SMS klijentu kada su uklonjeni delovi za popravku u radionici
   */
  static clientPartsRemoved(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Naš serviser je identifikovao kvar na vašem ${data.deviceType} (servis #${data.serviceId}).

Određeni delovi su uklonjeni radi stručne popravke u našoj radionici. Obavesitićemo vas o daljem toku popravke.

Za dodatne informacije: ${this.CONTACT_PHONE}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS klijentu kada tehničar poruči rezervni deo
   */
  static clientPartOrderedByTechnician(data: SMSTemplateData): string {
    const deliveryTime = data.deliveryTime || (data.urgency === 'urgent' ? '3-5' : '7-10') + ' radnih dana';
    
    return `Poštovani ${data.clientName || 'klijente'},

Za vaš ${data.deviceType} (servis #${data.serviceId}) je naručen potreban rezervni deo.

Očekivano vreme dostave: ${deliveryTime}
Kontaktiraćemo vas čim deo stigne u magacin.

Za dodatne informacije: ${this.CONTACT_PHONE}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS klijentu kada tehničar označi da klijent nije dostupan
   */
  static clientNotAvailableByTechnician(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Naš serviser je pokušao da vas kontaktira u vezi servisa #${data.serviceId} za ${data.deviceType}, ali vas nije zatekao.

Molimo vas pozovite nas na ${this.CONTACT_PHONE} da dogovorimo novi termin koji vam odgovara.

Hvala na razumevanju.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS administratoru kada tehničar ukloni delove
   */
  static adminPartsRemovedByTechnician(data: SMSTemplateData): string {
    return `${data.adminName || 'Administratore'},

DELOVI UKLONJENI - Servis #${data.serviceId}

Serviser: ${data.technicianName}
Klijent: ${data.clientName} (${data.clientPhone || 'nema telefon'})
Uređaj: ${data.deviceType}

Delovi uklonjeni za popravku u radionici.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS administratoru kada serviser poruči rezervni deo
   */
  static adminPartOrderedByTechnician(data: SMSTemplateData): string {
    const urgencyText = data.urgency === 'urgent' ? ' - HITNO!' : '';
    
    return `${data.adminName || 'Administratore'},

PORUDŽBINA DELOVA${urgencyText} - Servis #${data.serviceId}

Serviser: ${data.technicianName}
Klijent: ${data.clientName} (${data.clientPhone || 'nema telefon'})
Uređaj: ${data.deviceType}
Deo: ${data.partName}

Potrebna Vaša potvrda ili akcija.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS administratoru kada klijent nije dostupan
   */
  static adminClientUnavailableByTechnician(data: SMSTemplateData): string {
    return `${data.adminName || 'Administratore'},

KLIJENT NEDOSTUPAN - Servis #${data.serviceId}

Serviser: ${data.technicianName}
Klijent: ${data.clientName} (${data.clientPhone || 'nema telefon'})
Uređaj: ${data.deviceType}
Status: ${data.unavailableType || 'nedostupan'}

Potrebno novo zakazivanje termina.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS administratoru kada tehničar poruči rezervni deo
   */
  static adminPartOrderedByTechnician(data: SMSTemplateData): string {
    const urgencyText = data.urgency === 'urgent' ? ' - HITNO!' : '';
    
    return `${data.adminName || 'Administratore'},

PORUDŽBINA DELA${urgencyText} - Servis #${data.serviceId}

Serviser: ${data.technicianName}
Klijent: ${data.clientName} (${data.clientPhone || 'nema telefon'})
Uređaj: ${data.deviceType}
Deo: ${data.partName || 'nije specificiran'}

${this.COMPANY_NAME}`;
  }

  /**
   * SMS administratoru kada tehničar označi da klijent nije dostupan
   */
  static adminClientNotAvailableByTechnician(data: SMSTemplateData): string {
    return `${data.adminName || 'Administratore'},

KLIJENT NEDOSTUPAN - Servis #${data.serviceId}

Serviser: ${data.technicianName}
Klijent: ${data.clientName} (${data.clientPhone || 'nema telefon'})
Uređaj: ${data.deviceType}

Potrebno organizovati novi termin.

${this.COMPANY_NAME}`;
  }

  // DIREKTNI SMS TEMPLATE-I ZA TEHNIČARE

  /**
   * SMS klijentu kada tehničar stiže na lokaciju
   */
  static technicianArrived(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Vaš serviser ${data.technicianName} je stigao na lokaciju za servis #${data.serviceId} (${data.deviceType}).

Molimo da se pripremite za pregled uređaja.

${this.COMPANY_NAME}`;
  }

  /**
   * SMS klijentu kada tehničar kasni
   */
  static technicianDelayed(data: SMSTemplateData): string {
    return `Poštovani ${data.clientName || 'klijente'},

Vaš serviser ${data.technicianName} za servis #${data.serviceId} (${data.deviceType}) je zadržan i stiže sa kašnjenjem.

Molimo za razumevanje. Kontaktiraćemo vas sa tačnim vremenom dolaska.

Za hitne informacije: ${this.CONTACT_PHONE}

${this.COMPANY_NAME}`;
  }

  // GENERIČKE FUNKCIJE

  /**
   * Generiše SMS na osnovu tipa i podataka
   */
  static generateSMS(type: string, data: SMSTemplateData): string {
    switch (type) {
      case 'service_completed':
        return this.serviceCompleted(data);
      case 'client_not_available':
        return this.clientNotAvailable(data);
      case 'client_no_answer':
        return this.clientNoAnswer(data);
      case 'spare_part_arrived':
        return this.sparePartArrived(data);
      case 'spare_part_ordered':
        return this.sparePartOrdered(data);
      case 'service_assigned_to_partner':
        return this.serviceAssignedToPartner(data);
      case 'part_ordered_by_partner':
        return this.partOrderedByPartner(data);
      case 'partner_service_completed':
        return this.partnerServiceCompleted(data);
      case 'technician_part_arrived':
        return this.technicianPartArrived(data);
      case 'new_service_assigned':
        return this.newServiceAssigned(data);
      case 'part_status_update':
        return this.partStatusUpdate(data);
      // KORISNICI - AUTOMATSKI TRIGGERI
      case 'client_status_update':
        return this.clientStatusUpdate(data);
      case 'client_spare_part_ordered':
        return this.clientSparePartOrdered(data);
      case 'client_spare_part_arrived':
        return this.clientSparePartArrived(data);
      // POSLOVNI PARTNERI - AUTOMATSKI TRIGGERI
      case 'business_partner_technician_assigned':
        return this.businessPartnerTechnicianAssigned(data);
      case 'business_partner_status_update':
        return this.businessPartnerStatusUpdate(data);
      case 'business_partner_spare_part_ordered':
        return this.businessPartnerSparePartOrdered(data);
      // NOVI SPARE PARTS TEMPLATE-I
      case 'client_parts_ordered':
        return this.clientPartsOrdered(data);
      case 'business_partner_parts_ordered':
        return this.businessPartnerPartsOrdered(data);
      case 'business_partner_parts_arrived':
        return this.businessPartnerPartsArrived(data);
      // ADMIN SMS TEMPLATE-I
      case 'admin_new_service':
        return this.adminNewService(data);
      case 'admin_status_change':
        return this.adminStatusChange(data);
      case 'admin_technician_assigned':
        return this.adminTechnicianAssigned(data);
      case 'admin_parts_ordered':
        return this.adminPartsOrdered(data);
      case 'admin_parts_arrived':
        return this.adminPartsArrived(data);
      // TEHNIČKE AKCIJE - NOVI TEMPLATE-I
      case 'client_parts_removed':
        return this.clientPartsRemoved(data);
      case 'client_part_ordered_by_technician':
        return this.clientPartOrderedByTechnician(data);
      case 'client_not_available_by_technician':
        return this.clientNotAvailableByTechnician(data);
      case 'admin_parts_removed_by_technician':
        return this.adminPartsRemovedByTechnician(data);
      case 'admin_part_ordered_by_technician':
        return this.adminPartOrderedByTechnician(data);
      case 'admin_client_not_available_by_technician':
        return this.adminClientNotAvailableByTechnician(data);
      // SPECIJALNI TEMPLATE-I ZA KLIJENT_NIJE_DOSTUPAN TRIGGERE
      case 'klijent_nije_dostupan':
        return this.clientNotAvailableByTechnician(data);
      case 'admin_klijent_nije_dostupan':
        return this.adminClientUnavailableByTechnician(data);
      // DIREKTNI SMS TEMPLATE-I ZA TEHNIČARE
      case 'technician_arrived':
        return this.technicianArrived(data);
      case 'technician_delayed':
        return this.technicianDelayed(data);
      default:
        throw new Error(`Nepoznat tip SMS template-a: ${type}`);
    }
  }

  /**
   * Lista svih dostupnih template-a
   */
  static getAvailableTemplates(): { [key: string]: string } {
    return {
      'service_completed': 'Servis završen - klijent',
      'client_not_available': 'Klijent se ne javlja',
      'client_no_answer': 'Klijent ne odgovara',
      'spare_part_arrived': 'Rezervni deo stigao - klijent',
      'spare_part_ordered': 'Rezervni deo poručen - klijent',
      // KORISNICI - AUTOMATSKI TRIGGERI
      'client_status_update': 'Promjena statusa - klijent',
      'client_spare_part_ordered': 'Rezervni dio poručen - klijent',
      'client_spare_part_arrived': 'Rezervni dio stigao - klijent',
      // POSLOVNI PARTNERI
      'service_assigned_to_partner': 'Servis dodeljen partneru',
      'part_ordered_by_partner': 'Deo poručen - partner',
      'partner_service_completed': 'Servis završen - partner',
      // NOVI SPARE PARTS TEMPLATE-I
      'client_parts_ordered': 'Rezervni dio poručen - klijent',
      'business_partner_parts_ordered': 'Rezervni dio poručen - poslovni partner',
      'business_partner_parts_arrived': 'Rezervni dio stigao - poslovni partner',
      // ADMIN SMS TEMPLATE-I
      'admin_new_service': 'Novi servis - admin',
      'admin_status_change': 'Promena statusa - admin',
      'admin_technician_assigned': 'Dodeljen serviser - admin',
      'admin_parts_ordered': 'Porudžbina delova - admin',
      'admin_parts_arrived': 'Stigli delovi - admin',
      // POSLOVNI PARTNERI - AUTOMATSKI TRIGGERI
      'business_partner_technician_assigned': 'Dodela tehničara - partner',
      'business_partner_status_update': 'Promjena statusa - partner',
      'business_partner_spare_part_ordered': 'Rezervni dio poručen - partner',
      // SERVISERI
      'technician_part_arrived': 'Rezervni deo stigao - serviser',
      'new_service_assigned': 'Novi servis dodeljen',
      'part_status_update': 'Status rezervnog dela',
      // TEHNIČKE AKCIJE - NOVI TEMPLATE-I
      'client_parts_removed': 'Delovi uklonjeni - klijent',
      'client_part_ordered_by_technician': 'Deo poručen od tehničara - klijent',
      'client_not_available_by_technician': 'Klijent nedostupan od tehničara - klijent',
      'admin_parts_removed_by_technician': 'Delovi uklonjeni od tehničara - admin',
      'admin_part_ordered_by_technician': 'Deo poručen od tehničara - admin',
      'admin_client_not_available_by_technician': 'Klijent nedostupan od tehničara - admin',
      // DIREKTNI SMS TEMPLATE-I ZA TEHNIČARE
      'technician_arrived': 'Tehničar stigao na lokaciju - klijent',
      'technician_delayed': 'Tehničar kasni - klijent'
    };
  }
}