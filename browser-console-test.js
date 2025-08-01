// Browser console test - copy and paste this in the browser console
// while logged in as admin

console.log('🧪 Browser ComPlus Email Test');

fetch('/api/services/186', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'completed',
    technicianNotes: 'Browser test ComPlus email notifikacije - završetak servisa'
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Servis završen:', data);
  console.log('📧 Proverite server logove za ComPlus email');
})
.catch(error => {
  console.error('❌ Greška:', error);
});