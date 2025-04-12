// Ovo je minimalna verzija stranice servisa, bez ikakvih složenih komponenti
import React, { useEffect, useState } from 'react';

// Minimalna stilizacija
const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  title: {
    color: '#333',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginTop: '20px'
  },
  th: {
    backgroundColor: '#f2f2f2',
    padding: '12px',
    textAlign: 'left' as const,
    borderBottom: '1px solid #ddd'
  },
  td: {
    padding: '10px',
    borderBottom: '1px solid #eee'
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px',
    marginTop: '10px',
    borderRadius: '4px'
  },
  loading: {
    color: '#666',
    marginTop: '20px'
  }
};

// Tip za servis - minimalno potrebno
type ApiService = {
  id: number;
  status: string;
  createdAt?: string; // camelCase format
  created_at?: string; // snake_case format
  description: string;
  [key: string]: any; // Dozvoljava dodatna polja koja možda dobijemo sa API-ja
};

// Tip za konzistentni format na frontendu
type BasicService = {
  id: number;
  status: string;
  createdAt: string; // Uvijek koristimo camelCase u React komponenti
  description: string;
};

const BasicServicesPage = () => {
  const [services, setServices] = useState<BasicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Funkcija za osvežavanje podataka
  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/services');
      if (!response.ok) {
        throw new Error(`HTTP greška: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Učitani podaci:', data);
      
      // Detaljniji debug log za prvi element, ako postoji
      if (Array.isArray(data) && data.length > 0) {
        console.log('Prvi element iz API-ja:', JSON.stringify(data[0], null, 2));
        console.log('Imena polja prvog elementa:', Object.keys(data[0]));
        
        // Provjera da li element sadrži 'createdAt' ili 'created_at'
        if (data[0].createdAt) {
          console.log("API vraća polje 'createdAt':", data[0].createdAt);
        } else if (data[0].created_at) {
          console.log("API vraća polje 'created_at':", data[0].created_at);
        } else {
          console.log("Niti 'createdAt' niti 'created_at' nije pronađeno u podacima!");
        }
      }
      
      // Transformacija podataka kako bi se ujednačila imena polja
      const transformedData = Array.isArray(data) ? data.map(service => {
        // Pronađimo sve moguće oblike datuma
        let dateField = '';
        if (service.createdAt) {
          dateField = service.createdAt;
          console.log(`Koristeći createdAt: ${dateField}`);
        } else if (service.created_at) {
          dateField = service.created_at;
          console.log(`Koristeći created_at: ${dateField}`);
        } else {
          console.warn(`Servis ID ${service.id} nema datum!`);
        }
        
        return {
          id: service.id,
          status: service.status,
          createdAt: dateField,
          description: service.description || ''
        };
      }) : [];
      
      console.log('Transformirani podaci:', transformedData);
      setServices(transformedData);
    } catch (err) {
      console.error('Greška pri učitavanju servisa:', err);
      setError((err as Error).message || 'Greška pri učitavanju podataka');
    } finally {
      setLoading(false);
    }
  };
  
  // Učitavanje servisa pri prvom renderovanju
  useEffect(() => {
    loadServices();
  }, []);
  
  // Helper funkcija za formatiranje datuma
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      // Parsiranje datuma prema različitim mogućim formatima
      const date = new Date(dateString);
      
      // Provjera valjanosti datuma
      if (isNaN(date.getTime())) {
        return dateString; // Vraćamo originalni string ako datum nije valjan
      }
      
      // Formatiranje prema lokalnim postavkama
      return date.toLocaleDateString('sr-ME', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      console.warn(`Neuspješno parsiranje datuma: ${dateString}`);
      return dateString;
    }
  };
  
  // Helper funkcija za labelu statusa
  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'pending': return 'Na čekanju';
      case 'scheduled': return 'Zakazano';
      case 'in_progress': return 'U procesu';
      case 'waiting_parts': return 'Čeka delove';
      case 'completed': return 'Završeno';
      case 'cancelled': return 'Otkazano';
      default: return status;
    }
  };
  
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Lista servisa - osnovna verzija</h1>
      
      {error && (
        <div style={styles.error}>
          <p><strong>Greška:</strong> {error}</p>
          <button style={styles.button} onClick={loadServices}>
            Pokušaj ponovo
          </button>
        </div>
      )}
      
      {loading ? (
        <p style={styles.loading}>Učitavanje servisa...</p>
      ) : (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Datum</th>
                <th style={styles.th}>Opis</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{...styles.td, textAlign: 'center'}}>
                    Nema pronađenih servisa
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.id}>
                    <td style={styles.td}>{service.id}</td>
                    <td style={styles.td}>{getStatusLabel(service.status)}</td>
                    <td style={styles.td}>{formatDate(service.createdAt)}</td>
                    <td style={styles.td}>{service.description || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          <button 
            style={styles.button} 
            onClick={loadServices}
            disabled={loading}
          >
            {loading ? 'Učitavanje...' : 'Osveži podatke'}
          </button>
          
          <div style={{marginTop: '20px'}}>
            <a href="/" style={{color: '#007bff', textDecoration: 'none'}}>
              &larr; Povratak na početnu stranicu
            </a>
          </div>
        </>
      )}
    </div>
  );
};

export default BasicServicesPage;