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
type BasicService = {
  id: number;
  status: string;
  createdAt: string; // Ime koje očekuje React komponenta
  created_at?: string; // Ime koje možda dolazi sa API-ja
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
      
      // Transformacija podataka kako bi se ujednačila imena polja
      const transformedData = Array.isArray(data) ? data.map(service => ({
        id: service.id,
        status: service.status,
        // Ako imamo createdAt koristimo ga, inače koristimo created_at ako postoji
        createdAt: service.createdAt || service.created_at || '',
        description: service.description || ''
      })) : [];
      
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