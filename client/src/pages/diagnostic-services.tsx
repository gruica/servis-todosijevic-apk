import React, { useEffect, useState } from 'react';

// Osnovni stil za stranicu
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
  },
  debug: {
    backgroundColor: '#f5f5f5',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    margin: '20px 0',
    whiteSpace: 'pre-wrap' as const,
    fontSize: '14px',
    fontFamily: 'monospace'
  }
};

// Dijagnostička verzija servisa
const DiagnosticServicesPage = () => {
  const [rawData, setRawData] = useState<string>('Nema podataka');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  // Učitavanje servisa pri prvom renderovanju
  useEffect(() => {
    loadServices();
  }, []);
  
  // Funkcija za osvežavanje podataka
  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo({});
      
      const startTime = Date.now();
      
      // Prvo učitavanje čistog response-a kao tekst
      const responseRaw = await fetch('/api/services');
      const responseTime = Date.now() - startTime;
      
      const contentType = responseRaw.headers.get('Content-Type');
      setDebugInfo(prev => ({
        ...prev,
        status: responseRaw.status,
        statusText: responseRaw.statusText,
        contentType,
        responseTime: `${responseTime}ms`
      }));
      
      if (!responseRaw.ok) {
        throw new Error(`HTTP greška: ${responseRaw.status} ${responseRaw.statusText}`);
      }
      
      // Dobijamo sirovi tekst odgovora
      const rawText = await responseRaw.text();
      setRawData(rawText);
      
      try {
        // Parsiramo JSON
        const parsedJson = JSON.parse(rawText);
        setDebugInfo(prev => ({
          ...prev, 
          dataType: Array.isArray(parsedJson) ? 'array' : typeof parsedJson,
          dataLength: Array.isArray(parsedJson) ? parsedJson.length : 1,
          firstItemKeys: Array.isArray(parsedJson) && parsedJson.length > 0 
            ? Object.keys(parsedJson[0]) 
            : null
        }));
        
        if (Array.isArray(parsedJson)) {
          setParsedData(parsedJson);
        } else {
          setParsedData([]);
          setError('API nije vratio niz podataka. Dobijeni oblik: ' + typeof parsedJson);
        }
      } catch (parseError: any) {
        setError(`Greška pri parsiranju JSON odgovora: ${parseError.message}`);
        setParsedData([]);
      }
    } catch (err: any) {
      console.error('Greška pri učitavanju servisa:', err);
      setError(err.message || 'Nepoznata greška pri učitavanju podataka');
      setParsedData([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper funkcija za formatiranje datuma
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('sr-ME', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
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
      <h1 style={styles.title}>Dijagnostika stranice servisa</h1>
      
      <div style={styles.debug}>
        <h3>Debugiranje i praćenje problema</h3>
        <p><strong>Status API zahtjeva:</strong> {debugInfo.status} {debugInfo.statusText}</p>
        <p><strong>Tip sadržaja:</strong> {debugInfo.contentType || 'Nepoznat'}</p>
        <p><strong>Vrijeme odgovora:</strong> {debugInfo.responseTime || 'Nije mjereno'}</p>
        <p><strong>Tip podataka:</strong> {debugInfo.dataType || 'Nepoznat'}</p>
        <p><strong>Broj elemenata:</strong> {debugInfo.dataLength || 0}</p>
        {debugInfo.firstItemKeys && (
          <div>
            <p><strong>Ključevi prvog elementa:</strong></p>
            <ul>
              {debugInfo.firstItemKeys.map((key: string) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
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
          <h2>Sirovi odgovor sa API-ja</h2>
          <pre style={{ 
            ...styles.debug, 
            maxHeight: '200px', 
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {rawData.length > 1000 ? rawData.substring(0, 1000) + '...' : rawData}
          </pre>
          
          <h2>Tabla servisa</h2>
          {parsedData.length === 0 ? (
            <p>Nema pronađenih servisa ili je parsiranje podataka neuspješno.</p>
          ) : (
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
                {parsedData.map((service) => (
                  <tr key={service.id}>
                    <td style={styles.td}>{service.id}</td>
                    <td style={styles.td}>{getStatusLabel(service.status)}</td>
                    <td style={styles.td}>
                      {service.createdAt 
                        ? formatDate(service.createdAt) 
                        : service.created_at 
                          ? formatDate(service.created_at) + ' (created_at)'
                          : '-'}
                    </td>
                    <td style={styles.td}>{service.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          <button 
            style={styles.button} 
            onClick={loadServices}
            disabled={loading}
          >
            {loading ? 'Učitavanje...' : 'Osveži podatke'}
          </button>
          
          <div style={{marginTop: '20px'}}>
            <a href="/diagnostics" style={{color: '#007bff', textDecoration: 'none'}}>
              &larr; Povratak na dijagnostičku stranicu
            </a>
          </div>
        </>
      )}
    </div>
  );
};

export default DiagnosticServicesPage;