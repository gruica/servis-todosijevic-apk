import { storage } from "./storage";
import { MaintenanceSchedule, MaintenanceFrequency } from "@shared/schema";
import { emailService } from "./email-service";

/**
 * Servis za praćenje i predviđanje održavanja uređaja
 * Ova klasa je odgovorna za:
 * 1. Ažuriranje datuma održavanja na osnovu frekvencije
 * 2. Generisanje obaveštenja o predstojecem održavanju
 * 3. Predlaganje termina za preventivno održavanje
 */
export class MaintenanceService {
  private static instance: MaintenanceService;
  private checkIntervalId: NodeJS.Timeout | null = null;
  
  // Konstruktor je privatan jer se koristi singleton pattern
  private constructor() {}
  
  /**
   * Dohvata jedinstvenu instancu MaintenanceService (Singleton pattern)
   */
  public static getInstance(): MaintenanceService {
    if (!MaintenanceService.instance) {
      MaintenanceService.instance = new MaintenanceService();
    }
    return MaintenanceService.instance;
  }
  
  /**
   * Pokreće servis za održavanje 
   * @param checkInterval Interval u milisekundama koliko često proveravati planove (podrazumevano svakih sat vremena)
   */
  public start(checkInterval: number = 60 * 60 * 1000): void {
    try {
      // Ako već radi, zaustavi pa ponovo pokreni
      if (this.checkIntervalId) {
        this.stop();
      }
      
      console.log("Pokretanje servisa za održavanje...");
      
      // Odmah pokreni proveru sa error handling-om
      this.checkMaintenanceSchedules()
        .then(() => console.log("Početna provera planova održavanja završena"))
        .catch(err => {
          console.error("Greška pri početnoj proveri planova održavanja:", err);
          // Ne prekidaj aplikaciju zbog greške u održavanju
        });
      
      // Postavi interval za redovne provere sa dodatnim error handling-om
      this.checkIntervalId = setInterval(() => {
        this.checkMaintenanceSchedules()
          .catch(err => {
            console.error("Greška pri periodičnoj proveri planova održavanja:", err);
            // Log greške ali nastavi sa radom
          });
      }, checkInterval);
      
      console.log(`Servis za održavanje postavljen sa intervalom od ${checkInterval}ms`);
    } catch (error) {
      console.error("Kritična greška pri pokretanju servisa za održavanje:", error);
      // Ne baci grešku van funkcije da ne prekine startup aplikacije
    }
  }
  
  /**
   * Zaustavlja servis za održavanje
   */
  public stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      console.log("Servis za održavanje zaustavljen");
    }
  }
  
  /**
   * Proverava sve planove održavanja i ažurira ih po potrebi
   */
  public async checkMaintenanceSchedules(): Promise<void> {
    try {
      // Dohvati sve aktivne planove održavanja
      const schedules = await storage.getAllMaintenanceSchedules();
      const activeSchedules = schedules.filter(schedule => schedule.isActive);
      
      console.log(`Provera ${activeSchedules.length} aktivnih planova održavanja`);
      
      const now = new Date();
      
      // Obradi svaki plan
      for (const schedule of activeSchedules) {
        // Obradi planove koji su prošli
        await this.processPastMaintenanceSchedule(schedule, now);
        
        // Generiši obaveštenje za nadolazeće održavanje
        await this.createAlertForUpcomingMaintenance(schedule, now);
      }
    } catch (error) {
      console.error("Greška pri proveri planova održavanja:", error);
      throw error;
    }
  }
  
  /**
   * Obrađuje planove održavanja koji su prošli i ažurira ih za sledeći period
   */
  private async processPastMaintenanceSchedule(schedule: MaintenanceSchedule, now: Date): Promise<void> {
    const nextMaintenanceDate = new Date(schedule.nextMaintenanceDate);
    
    // Ako je vreme održavanja već prošlo, potrebno je ažurirati plan za sledeći period
    if (nextMaintenanceDate < now) {
      console.log(`Plan održavanja #${schedule.id} je prošao, ažuriranje za sledeći period...`);
      
      // Prethodni datum održavanja postaje onaj koji je upravo prošao
      const lastMaintenanceDate = new Date(schedule.nextMaintenanceDate);
      
      // Izračunaj novi datum održavanja na osnovu frekvencije
      const newNextMaintenanceDate = this.calculateNextMaintenanceDate(lastMaintenanceDate, schedule.frequency, schedule.customIntervalDays);
      
      // Ažuriraj plan održavanja
      await storage.updateMaintenanceSchedule(schedule.id, {
        ...schedule,
        lastMaintenanceDate,
        nextMaintenanceDate: newNextMaintenanceDate,
      });
      
      // Kreiraj obaveštenje o propuštenom održavanju
      await storage.createMaintenanceAlert({
        scheduleId: schedule.id,
        title: "Propušteno održavanje",
        message: `Propušteno je planirano održavanje za "${schedule.name}" koje je trebalo da se izvrši ${this.formatDate(lastMaintenanceDate)}. Sledeće je zakazano za ${this.formatDate(newNextMaintenanceDate)}.`,
        alertDate: now,
        status: "pending",
        isRead: false
      });
    }
  }
  
  /**
   * Kreira obaveštenje za nadolazeće održavanje ako je u narednih X dana
   * i ne postoji već aktivno obaveštenje za taj plan
   */
  private async createAlertForUpcomingMaintenance(schedule: MaintenanceSchedule, now: Date): Promise<void> {
    const nextMaintenanceDate = new Date(schedule.nextMaintenanceDate);
    const daysUntilMaintenance = Math.round((nextMaintenanceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Ako je održavanje zakazano u narednih 7 dana
    if (daysUntilMaintenance >= 0 && daysUntilMaintenance <= 7) {
      // Proveri da li postoji aktivno obaveštenje za ovaj plan
      const existingAlerts = await storage.getMaintenanceAlertsBySchedule(schedule.id);
      const hasActiveAlert = existingAlerts.some(
        alert => alert.status === "pending" && 
                 new Date(alert.createdAt).getTime() > now.getTime() - (7 * 24 * 60 * 60 * 1000)
      );
      
      // Ako ne postoji aktivno obaveštenje, kreiraj novo
      if (!hasActiveAlert) {
        console.log(`Kreiranje obaveštenja za nadolazeće održavanje #${schedule.id} - za ${daysUntilMaintenance} dana`);
        
        let message: string;
        if (daysUntilMaintenance === 0) {
          message = `Održavanje "${schedule.name}" je zakazano za danas.`;
        } else if (daysUntilMaintenance === 1) {
          message = `Održavanje "${schedule.name}" je zakazano za sutra.`;
        } else {
          message = `Održavanje "${schedule.name}" je zakazano za ${daysUntilMaintenance} dana (${this.formatDate(nextMaintenanceDate)}).`;
        }
        
        // Kreiraj obaveštenje
        await storage.createMaintenanceAlert({
          scheduleId: schedule.id,
          title: "Nadolazeće održavanje",
          message,
          alertDate: now,
          status: "pending",
          isRead: false
        });
        
        // Pošalji email obaveštenje klijentu
        try {
          // Dohvati uređaj za koji je zakazano održavanje
          const appliance = await storage.getAppliance(schedule.applianceId);
          if (appliance && appliance.clientId) {
            // Dohvati klijenta
            const client = await storage.getClient(appliance.clientId);
            if (client && client.email) {
              // Dohvati dodatne informacije o uređaju
              let applianceName = appliance.model || appliance.serialNumber || "Nepoznat uređaj";
              if (appliance.manufacturerId) {
                const manufacturer = await storage.getManufacturer(appliance.manufacturerId);
                if (manufacturer) {
                  applianceName = `${manufacturer.name} ${applianceName}`;
                }
              }
              
              // Pošalji email obaveštenje
              await emailService.sendMaintenanceReminder(
                client,
                applianceName,
                this.formatDate(nextMaintenanceDate),
                schedule.description || ""
              );
              
              console.log(`Email obaveštenje poslato klijentu ${client.fullName} za održavanje #${schedule.id}`);
            }
          }
        } catch (error) {
          console.error(`Greška pri slanju email obaveštenja za održavanje #${schedule.id}:`, error);
          // Ne bacamo grešku dalje jer ne želimo da narušimo glavnu funkcionalnost
        }
      }
    }
  }
  
  /**
   * Izračunava sledeći datum održavanja na osnovu frekvencije
   */
  private calculateNextMaintenanceDate(
    lastDate: Date, 
    frequency: MaintenanceFrequency, 
    customIntervalDays?: number | null
  ): Date {
    const nextDate = new Date(lastDate);
    
    switch (frequency) {
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "biannual":
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case "annual":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case "custom":
        if (customIntervalDays && customIntervalDays > 0) {
          nextDate.setDate(nextDate.getDate() + customIntervalDays);
        } else {
          // Podrazumevano 30 dana ako nije specificiran interval
          nextDate.setDate(nextDate.getDate() + 30);
        }
        break;
    }
    
    return nextDate;
  }
  
  /**
   * Formatira datum u lokalni string
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('sr-Latn-ME', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }
}

// Kreira i izvozi instancu servisa
export const maintenanceService = MaintenanceService.getInstance();