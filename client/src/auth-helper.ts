import { apiRequest } from "@/lib/queryClient";

/**
 * Pomocna klasa koja sadrzi funkcije za autentifikaciju
 */
export class AuthHelper {
  /**
   * Prijavljuje korisnika sa datim kredencijalima
   */
  static async login(username: string, password: string) {
    const response = await apiRequest("POST", "/api/login", { username, password });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Greška pri prijavljivanju");
    }
    
    return await response.json();
  }
  
  /**
   * Odjavljuje trenutno prijavljenog korisnika
   */
  static async logout() {
    const response = await apiRequest("POST", "/api/logout");
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Greška pri odjavljivanju");
    }
    
    return true;
  }
  
  /**
   * Dohvata trenutno prijavljenog korisnika
   */
  static async getCurrentUser() {
    const response = await fetch("/api/user");
    
    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      
      const errorText = await response.text();
      throw new Error(errorText || "Greška pri dohvatanju korisnika");
    }
    
    return await response.json();
  }
  
  /**
   * Mijenja šifru korisnika
   */
  static async changePassword(currentPassword: string, newPassword: string) {
    const response = await apiRequest("POST", "/api/change-password", { 
      currentPassword, 
      newPassword 
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Greška pri promjeni šifre");
    }
    
    return await response.json();
  }
}