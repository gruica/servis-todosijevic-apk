import React from 'react';

function App() {
  const buildTime = new Date().toLocaleString('sr-RS');
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '32px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '16px'
        }}>
          📱 Servis Todosijević
        </h1>
        
        <p style={{
          color: '#6b7280',
          marginBottom: '32px',
          fontSize: '16px'
        }}>
          Mobilna aplikacija za upravljanje servisom belih dobara
        </p>

        <div style={{
          backgroundColor: '#dbeafe',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1e40af',
            marginBottom: '8px'
          }}>
            🏢 O Aplikaciji
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#1e3a8a',
            lineHeight: '1.5'
          }}>
            Profesionalna platforma za upravljanje servisom frižidera, 
            veš mašina, sudijera i drugih belih dobara.
          </p>
        </div>

        <div style={{
          backgroundColor: '#dcfce7',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#166534',
            marginBottom: '12px'
          }}>
            ✅ Funkcionalnosti
          </h2>
          <ul style={{
            fontSize: '14px',
            color: '#15803d',
            textAlign: 'left',
            lineHeight: '1.6',
            paddingLeft: '16px'
          }}>
            <li>Praćenje statusa servisa</li>
            <li>Upravljanje klijentima</li>
            <li>Mobile-first pristup</li>
            <li>Offline capabilities</li>
          </ul>
        </div>

        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#92400e',
            marginBottom: '8px'
          }}>
            📱 APK Status
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#b45309',
            lineHeight: '1.5'
          }}>
            Aplikacija je uspešno kreirana kroz GitHub Actions workflow.<br />
            Android kompatibilnost: 7.0+
          </p>
        </div>

        <div style={{
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          © 2025 Frigo Sistem Todosijević<br />
          Build: {buildTime}
        </div>
      </div>
    </div>
  );
}

export default App;