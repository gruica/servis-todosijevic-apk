import { apiRequest } from "@/lib/queryClient";

/**
 * Pomocna klasa koja sadrzi funkcije za autentifikaciju
 */
export class AuthHelper {
  /**
   * Prijavljuje korisnika sa datim kredencijalima (JWT-based za mobile kompatibilnost)
   */
  static async login(username: string, password: string) {
    const response = await fetch("/api/jwt-login", { 
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password }) 
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Greška pri prijavljivanju" }));
      throw new Error(errorData.error || "Greška pri prijavljivanju");
    }
    
    const result = await response.json();
    
    // Sačuvaj JWT token u localStorage za mobilne browsere
    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }
    
    return result;
  }
  
  /**
   * Odjavljuje trenutno prijavljenog korisnika
   */
  static async logout() {
    const response = await apiRequest("/api/logout", { method: "POST" });
    
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
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return null;
    }
    
    const response = await fetch("/api/jwt-user", {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
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
    const response = await apiRequest("/api/change-password", { 
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Greška pri promjeni šifre");
    }
    
    return await response.json();
  }
}