import React from 'react';

function App() {
  const currentTime = new Date().toLocaleString('sr-RS');
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f9ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '450px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px'
        }}>
          📱
        </div>
        
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#1e293b',
          marginBottom: '8px',
          margin: '0 0 8px 0'
        }}>
          Servis Todosijević
        </h1>
        
        <p style={{
          color: '#64748b',
          marginBottom: '32px',
          fontSize: '18px',
          lineHeight: '1.5'
        }}>
          Mobilna aplikacija za upravljanje servisom belih dobara
        </p>

        <div style={{
          backgroundColor: '#e0f2fe',
          border: '2px solid #0284c7',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#0369a1',
            marginBottom: '12px',
            margin: '0 0 12px 0'
          }}>
            🏢 Profesionalna Platforma
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#0c4a6e',
            lineHeight: '1.6',
            margin: '0'
          }}>
            Kompletno digitalno upravljanje servisom frižidera, 
            veš mašina, sudijera i ostalih belih dobara.
          </p>
        </div>

        <div style={{
          backgroundColor: '#f0fdf4',
          border: '2px solid #22c55e',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#15803d',
            marginBottom: '12px',
            margin: '0 0 12px 0'
          }}>
            ✅ Ključne Funkcije
          </h2>
          <ul style={{
            fontSize: '16px',
            color: '#166534',
            textAlign: 'left',
            lineHeight: '1.8',
            paddingLeft: '20px',
            margin: '0'
          }}>
            <li>Real-time praćenje statusa servisa</li>
            <li>Upravljanje klijentima i aparatima</li>
            <li>Mobile-first dizajn</li>
            <li>Offline mogućnosti</li>
            <li>Push notifikacije</li>
          </ul>
        </div>

        <div style={{
          backgroundColor: '#fefce8',
          border: '2px solid #eab308',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#a16207',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            📱 APK Distribucija
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#92400e',
            lineHeight: '1.6',
            margin: '0'
          }}>
            Automatsko kreiranje Android APK-a kroz GitHub Actions.<br />
            Kompatibilnost: Android 7.0+ (API 24)
          </p>
        </div>

        <div style={{
          paddingTop: '24px',
          borderTop: '2px solid #e2e8f0',
          fontSize: '14px',
          color: '#64748b'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            © 2025 Frigo Sistem Todosijević
          </p>
          <p style={{ margin: '0', fontSize: '12px' }}>
            Build vreme: {currentTime}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;