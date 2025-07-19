import React, { useEffect, useState } from 'react';

// Dijagnostička stranica koja pokazuje sve greške i status aplikacije
const DiagnosticsPage = () => {
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [servicesData, setServicesData] = useState<any>(null);
  const [apiResponse, setApiResponse] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  
  useEffect(() => {
    checkServicesApi();
  }, []);
  
  // Provjera API-ja za servise
  const checkServicesApi = async () => {
    try {
      console.log('Započinjem provjeru API-ja za servise...');
      
      // Šaljemo request za servise with JWT token
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/services', { headers });
      const responseText = await response.text();
      
      setApiResponse(responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : ''));
      
      // Pokušaj parsiranja JSON-a
      try {
        const data = JSON.parse(responseText);
        setServicesData(data);
        
        if (Array.isArray(data)) {
          console.log('API je vratio niz podataka, duljina:', data.length);
          if (data.length > 0) {
            console.log('Prvi element:', data[0]);
            console.log('Ključevi u prvom elementu:', Object.keys(data[0]));
            
            // Provjera ključeva
            const keysToCheck = ['id', 'description', 'status', 'createdAt'];
            const missingKeys = keysToCheck.filter(key => !Object.keys(data[0]).includes(key));
            
            if (missingKeys.length > 0) {
              setErrorDetails(`API vraća podatke, ali nedostaju sljedeći ključevi: ${missingKeys.join(', ')}`);
              setApiStatus('error');
            } else {
              setApiStatus('success');
            }
          } else {
            console.log('API je vratio prazan niz');
            setApiStatus('success'); // Tehnički API radi ispravno
            setErrorDetails('API vraća prazan niz podataka. Nema servisa za prikaz.');
          }
        } else {
          console.log('API nije vratio niz:', data);
          setApiStatus('error');
          setErrorDetails('API nije vratio očekivani format podataka (niz).');
        }
      } catch (parseError) {
        console.error('Greška pri parsiranju JSON-a:', parseError);
        setApiStatus('error');
        setErrorDetails(`API nije vratio ispravan JSON. Greška: ${parseError.message}`);
      }
    } catch (error) {
      console.error('Greška pri provjeri API-ja:', error);
      setApiStatus('error');
      setErrorDetails(`Mrežna greška ili greška servera: ${error.message}`);
    }
  };
  
  // Test komponente na stranici
  const testRenderComponent = () => {
    try {
      // Ovo je jednostavan test renderiranja koji bi trebao uspjeti
      return (
        <div style={{ border: '1px solid green', padding: '10px', margin: '10px 0' }}>
          <p>Komponenta za testiranje uspješno renderirana</p>
        </div>
      );
    } catch (error) {
      return (
        <div style={{ border: '1px solid red', padding: '10px', margin: '10px 0' }}>
          <p>Greška pri renderiranju test komponente: {error.message}</p>
        </div>
      );
    }
  };
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Dijagnostika Aplikacije</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Verzija aplikacije</h2>
        <p>Verzija: 1.0.0 (Datum: {new Date().toLocaleDateString()})</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Test renderiranja komponente</h2>
        {testRenderComponent()}
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Status API-ja za servise</h2>
        <div style={{ 
          backgroundColor: 
            apiStatus === 'loading' ? '#e3f2fd' : 
            apiStatus === 'success' ? '#e8f5e9' : 
            '#ffebee',
          padding: '15px',
          borderRadius: '4px'
        }}>
          <p><strong>Status:</strong> {
            apiStatus === 'loading' ? 'Provjera...' : 
            apiStatus === 'success' ? 'Uspješno' : 
            'Greška'
          }</p>
          
          {errorDetails && (
            <div style={{ marginTop: '10px' }}>
              <p><strong>Detalji greške:</strong></p>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '10px', 
                overflowX: 'auto',
                whiteSpace: 'pre-wrap'
              }}>{errorDetails}</pre>
            </div>
          )}
          
          <button 
            onClick={checkServicesApi}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Testiraj API ponovno
          </button>
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Podaci sa servera</h2>
        <div>
          <h3>Zaglavlja dokumenta</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}><strong>URL</strong></td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{window.location.href}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}><strong>User Agent</strong></td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{navigator.userAgent}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}><strong>Window Size</strong></td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{window.innerWidth} x {window.innerHeight}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <h3>Sirovi odgovor API-ja</h3>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflow: 'auto'
          }}>{apiResponse || 'Nema podataka'}</pre>
        </div>
        
        {servicesData && (
          <div style={{ marginTop: '20px' }}>
            <h3>Parsirana struktura podataka</h3>
            <div>
              <p><strong>Tip:</strong> {Array.isArray(servicesData) ? 'Niz' : typeof servicesData}</p>
              
              {Array.isArray(servicesData) && (
                <>
                  <p><strong>Broj elemenata:</strong> {servicesData.length}</p>
                  
                  {servicesData.length > 0 && (
                    <>
                      <p><strong>Ključevi prvog elementa:</strong></p>
                      <ul>
                        {Object.keys(servicesData[0]).map(key => (
                          <li key={key}>
                            <strong>{key}:</strong> {
                              typeof servicesData[0][key] === 'object' 
                                ? JSON.stringify(servicesData[0][key]) 
                                : String(servicesData[0][key])
                            }
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <a 
          href="/" 
          style={{
            color: '#007bff',
            textDecoration: 'none'
          }}
        >
          &larr; Povratak na početnu stranicu
        </a>
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <a 
          href="/services" 
          style={{
            color: '#007bff',
            textDecoration: 'none',
            marginLeft: '20px'
          }}
        >
          Pokušaj otvoriti standardnu stranicu Servisa &rarr;
        </a>
      </div>

      <div style={{ marginTop: '15px' }}>
        <a 
          href="/diagnostic-services" 
          style={{
            color: '#007bff',
            textDecoration: 'none',
            marginLeft: '20px'
          }}
        >
          Otvori dijagnostičku stranicu Servisa &rarr;
        </a>
      </div>

      <div style={{ marginTop: '15px' }}>
        <a 
          href="/system-diagnostics" 
          style={{
            color: '#007bff',
            textDecoration: 'none',
            marginLeft: '20px',
            fontWeight: 'bold'
          }}
        >
          Pametna Dijagnostička Kontrolna Tabla &rarr;
        </a>
      </div>
    </div>
  );
};

export default DiagnosticsPage;