import { DatabaseStorage } from './storage.js';
import { EmailService } from './email-service.js';

export interface SupplierIntegrationConfig {
  storage: DatabaseStorage;
  emailService: EmailService;
}

export interface SupplierOrderRequest {
  serviceId: number;
  partName: string;
  partNumber?: string;
  quantity: number;
  urgency: 'normal' | 'urgent';
  manufacturerId: number;
  description?: string;
  clientName?: string;
  technicianName?: string;
}

export interface SupplierOrderResult {
  success: boolean;
  supplierId?: number;
  message: string;
  orderNumber?: string;
  estimatedDeliveryDays?: number;
}

export class SupplierIntegrationService {
  private storage: DatabaseStorage;
  private emailService: EmailService;

  constructor(config: SupplierIntegrationConfig) {
    this.storage = config.storage;
    this.emailService = config.emailService;
  }

  /**
   * Dobija statistike o dobavljačima
   */
  async getSupplierStats() {
    try {
      const allSuppliers = await this.storage.getAllSuppliers();
      const activeSuppliers = await this.storage.getActiveSuppliers();
      const pendingOrdersCount = await this.storage.getPendingSupplierOrdersCount();
      
      // Brojanje dobavljača sa email integracijom
      const emailIntegrations = allSuppliers.filter(s => s.integrationMethod === 'email').length;

      return {
        totalSuppliers: allSuppliers.length,
        activeSuppliers: activeSuppliers.length,
        pendingOrders: pendingOrdersCount,
        emailIntegrations
      };
    } catch (error) {
      console.error('Greška pri dobijanju statistika dobavljača:', error);
      return {
        totalSuppliers: 0,
        activeSuppliers: 0,
        pendingOrders: 0,
        emailIntegrations: 0
      };
    }
  }

  /**
   * Automatski šalje porudžbinu odgovarajućem dobavljaču
   */
  async sendOrderToSupplier(sparePartOrderId: number, orderRequest: SupplierOrderRequest): Promise<SupplierOrderResult> {
    try {
      console.log(`[SUPPLIER INTEGRATION] Procesiranje automatske porudžbine za rezervni deo #${sparePartOrderId}`);

      // Dobij informacije o proizvođaču
      const manufacturer = await this.storage.getManufacturer(orderRequest.manufacturerId);
      if (!manufacturer) {
        return {
          success: false,
          message: 'Proizvođač nije pronađen'
        };
      }

      const manufacturerName = manufacturer.name.toLowerCase();
      console.log(`[SUPPLIER INTEGRATION] Proizvođač: ${manufacturerName}`);

      // Pronađi najboljeg dobavljača za ovaj brend
      const bestSupplier = await this.findBestSupplierForBrand(manufacturerName);
      
      if (!bestSupplier) {
        return {
          success: false,
          message: `Nije pronađen dobavljač za brend ${manufacturer.name}`
        };
      }

      console.log(`[SUPPLIER INTEGRATION] Izabran dobavljač: ${bestSupplier.name} (prioritet: ${bestSupplier.priority})`);

      // Kreiraj porudžbinu u bazi
      const supplierOrder = await this.storage.createSupplierOrder({
        supplierId: bestSupplier.id,
        sparePartOrderId: sparePartOrderId,
        status: 'pending',
        currency: 'EUR',
        autoRetryCount: 0
      });

      // Pošalji porudžbinu na osnovu metode integracije
      let orderResult: SupplierOrderResult;

      switch (bestSupplier.integrationMethod) {
        case 'email':
          orderResult = await this.sendEmailOrder(bestSupplier, orderRequest, supplierOrder.id);
          break;
        case 'api':
          orderResult = await this.sendApiOrder(bestSupplier, orderRequest, supplierOrder.id);
          break;
        case 'fax':
          orderResult = await this.sendFaxOrder(bestSupplier, orderRequest, supplierOrder.id);
          break;
        default:
          orderResult = {
            success: false,
            message: `Nepodržana metoda integracije: ${bestSupplier.integrationMethod}`
          };
      }

      // Ažuriraj status porudžbine
      if (orderResult.success) {
        await this.storage.updateSupplierOrder(supplierOrder.id, {
          status: 'sent',
          orderNumber: orderResult.orderNumber,
          sentAt: new Date(),
          estimatedDelivery: this.calculateEstimatedDelivery(bestSupplier.averageDeliveryDays)
        });
      } else {
        await this.storage.updateSupplierOrder(supplierOrder.id, {
          status: 'cancelled',
          supplierResponse: orderResult.message
        });
      }

      return {
        ...orderResult,
        supplierId: bestSupplier.id,
        estimatedDeliveryDays: bestSupplier.averageDeliveryDays
      };

    } catch (error) {
      console.error('[SUPPLIER INTEGRATION] Greška pri slanju porudžbine:', error);
      return {
        success: false,
        message: `Greška pri procesiranju porudžbine: ${error instanceof Error ? error.message : 'Nepoznata greška'}`
      };
    }
  }

  /**
   * Pronalazi najboljeg dobavljača za određeni brend
   */
  private async findBestSupplierForBrand(brandName: string): Promise<any> {
    try {
      const activeSuppliers = await this.storage.getActiveSuppliers();
      
      // Filtriraj dobavljače koji podržavaju ovaj brend
      const suitableSuppliers = activeSuppliers.filter(supplier => {
        if (!supplier.supportedBrands) return false;
        
        try {
          const supportedBrands = JSON.parse(supplier.supportedBrands);
          return supportedBrands.some((brand: string) => 
            brand.toLowerCase().includes(brandName) || brandName.includes(brand.toLowerCase())
          );
        } catch (error) {
          console.warn(`Greška pri parsiranju brendova za dobavljača ${supplier.name}:`, error);
          return false;
        }
      });

      if (suitableSuppliers.length === 0) {
        return null;
      }

      // Sortiraj po prioritetu (viši prioritet = bolji dobavljač)
      suitableSuppliers.sort((a, b) => b.priority - a.priority);

      return suitableSuppliers[0];
    } catch (error) {
      console.error('Greška pri pronalaženju dobavljača:', error);
      return null;
    }
  }

  /**
   * Šalje porudžbinu preko email-a
   */
  private async sendEmailOrder(supplier: any, orderRequest: SupplierOrderRequest, supplierOrderId: number): Promise<SupplierOrderResult> {
    try {
      console.log(`[EMAIL ORDER] Slanje email porudžbine dobavljaču ${supplier.name} (${supplier.email})`);

      const emailSubject = `Porudžbina rezervnog dela - ${orderRequest.partName}`;
      const emailBody = this.generateOrderEmailContent(supplier, orderRequest, supplierOrderId);

      // Pošalji email koristeći postojeći email servis
      const emailSent = await this.emailService.sendRawEmail(
        supplier.email,
        emailSubject,
        emailBody,
        emailBody // HTML i text identični za sada
      );

      if (emailSent) {
        const orderNumber = `AUTO-${Date.now()}-${supplierOrderId}`;
        
        console.log(`[EMAIL ORDER] Email uspešno poslat dobavljaču ${supplier.name}, order number: ${orderNumber}`);
        
        return {
          success: true,
          message: `Email porudžbina poslata dobavljaču ${supplier.name}`,
          orderNumber
        };
      } else {
        return {
          success: false,
          message: `Greška pri slanju email-a dobavljaču ${supplier.name}`
        };
      }
    } catch (error) {
      console.error('[EMAIL ORDER] Greška pri slanju email porudžbine:', error);
      return {
        success: false,
        message: `Email greška: ${error instanceof Error ? error.message : 'Nepoznata greška'}`
      };
    }
  }

  /**
   * Generiše sadržaj email-a za porudžbinu
   */
  private generateOrderEmailContent(supplier: any, orderRequest: SupplierOrderRequest, supplierOrderId: number): string {
    const orderNumber = `AUTO-${Date.now()}-${supplierOrderId}`;
    const timestamp = new Date().toLocaleString('sr-RS');

    return `
Poštovani ${supplier.contactPerson || supplier.name},

Potreban nam je sledeći rezervni deo:

=== INFORMACIJE O PORUDŽBINI ===
Broj porudžbine: ${orderNumber}
Datum: ${timestamp}
Hitnost: ${orderRequest.urgency === 'urgent' ? 'HITNO' : 'Normalno'}

=== REZERVNI DEO ===
Naziv: ${orderRequest.partName}
${orderRequest.partNumber ? `Broj dela: ${orderRequest.partNumber}` : ''}
Količina: ${orderRequest.quantity}
${orderRequest.description ? `Opis: ${orderRequest.description}` : ''}

=== INFORMACIJE O SERVISU ===
Servis ID: ${orderRequest.serviceId}
${orderRequest.clientName ? `Klijent: ${orderRequest.clientName}` : ''}
${orderRequest.technicianName ? `Tehničar: ${orderRequest.technicianName}` : ''}

=== MOLIMO VAS ===
1. Potvrdite dostupnost rezervnog dela
2. Obavestite nas o ceni i roku isporuke
3. Odgovorite na ovaj email sa potvrdom

Hvala vam na saradnji.

--
Automatska porudžbina
Frigo Sistem Todosijević
${timestamp}
    `.trim();
  }

  /**
   * Šalje porudžbinu preko API-ja (placeholder)
   */
  private async sendApiOrder(supplier: any, orderRequest: SupplierOrderRequest, supplierOrderId: number): Promise<SupplierOrderResult> {
    // TODO: Implementirati API integraciju kada bude dostupna
    console.log(`[API ORDER] API integracija za dobavljača ${supplier.name} još nije implementirana`);
    
    return {
      success: false,
      message: 'API integracija još nije implementirana'
    };
  }

  /**
   * Šalje porudžbinu preko faksa (placeholder)
   */
  private async sendFaxOrder(supplier: any, orderRequest: SupplierOrderRequest, supplierOrderId: number): Promise<SupplierOrderResult> {
    // TODO: Implementirati fax integraciju kada bude dostupna
    console.log(`[FAX ORDER] Fax integracija za dobavljača ${supplier.name} još nije implementirana`);
    
    return {
      success: false,
      message: 'Fax integracija još nije implementirana'
    };
  }

  /**
   * Računa procenjeni datum dostave
   */
  private calculateEstimatedDelivery(averageDeliveryDays: number): Date {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + averageDeliveryDays);
    return deliveryDate;
  }

  /**
   * Dobija sve porudžbine za određenog dobavljača
   */
  async getOrdersForSupplier(supplierId: number) {
    try {
      return await this.storage.getSupplierOrdersBySupplier(supplierId);
    } catch (error) {
      console.error('Greška pri dobijanju porudžbina za dobavljača:', error);
      return [];
    }
  }

  /**
   * Ažurira status porudžbine na osnovu odgovora dobavljača
   */
  async updateOrderStatus(supplierOrderId: number, status: string, supplierResponse?: string, trackingNumber?: string) {
    try {
      const updates: any = { status };
      
      if (supplierResponse) {
        updates.supplierResponse = supplierResponse;
      }
      
      if (trackingNumber) {
        updates.trackingNumber = trackingNumber;
      }

      return await this.storage.updateSupplierOrder(supplierOrderId, updates);
    } catch (error) {
      console.error('Greška pri ažuriranju statusa porudžbine:', error);
      return null;
    }
  }
}