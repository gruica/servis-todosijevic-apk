// Simple test component to check if React events work
export default function TestClick() {
  const handleClick = () => {
    console.log("🟢 TEST CLICK WORKS!");
    alert("Klik radi!");
  };

  return (
    <div style={{ padding: '20px', backgroundColor: 'red', color: 'white' }}>
      <button onClick={handleClick} style={{ padding: '10px', fontSize: '20px' }}>
        TEST KLIK
      </button>
    </div>
  );
}