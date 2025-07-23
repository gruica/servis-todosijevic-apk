// SMS Template sistem za automatsku komunikaciju sa klijentima, poslovnim partnerima i servisima

export interface SMSTemplateData {
  clientName?: string;
  serviceId?: string;
  technicianName?: string;
  deviceType?: string;
  deviceModel?: string;
  problemDescription?: string;
  partName?: string;
  estimatedDate?: string;
  actualDate?: string;
  cost?: string;
  businessPartnerName?: string;
  supplierName?: string;
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
      'service_assigned_to_partner': 'Servis dodeljen partneru',
      'part_ordered_by_partner': 'Deo poručen - partner',
      'partner_service_completed': 'Servis završen - partner',
      'technician_part_arrived': 'Rezervni deo stigao - serviser',
      'new_service_assigned': 'Novi servis dodeljen',
      'part_status_update': 'Status rezervnog dela'
    };
  }
}