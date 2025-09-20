export default function TestGitHub() {
  console.log('🟢 TestGitHub component rendering!');
  
  return (
    <div style={{
      padding: '20px', 
      backgroundColor: '#f0f8ff', 
      border: '2px solid #007acc',
      margin: '20px',
      borderRadius: '8px'
    }}>
      <h1 style={{color: '#007acc', fontSize: '24px', marginBottom: '16px'}}>
        ✅ GitHub Management Test Stranica
      </h1>
      <p style={{fontSize: '16px', marginBottom: '12px'}}>
        🎉 Aplikacija radi ispravno!
      </p>
      <p style={{fontSize: '14px', color: '#666'}}>
        Ova stranica potvrđuje da se React komponente učitavaju kako treba.
      </p>
      <div style={{marginTop: '16px', padding: '12px', backgroundColor: '#e8f4f8', borderRadius: '4px'}}>
        <strong>Status:</strong> Aplikacija je funkcionalna i gotova za GitHub integraciju!
      </div>
    </div>
  );
}