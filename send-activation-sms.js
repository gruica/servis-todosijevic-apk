import axios from 'axios';

// SMS Mobile API test za aktivaciju sistema
async function sendActivationSMS() {
  console.log('🚀 Šaljem SMS obaveštenja o aktivaciji sistema...');
  
  const recipients = ['067077092', '067077093', '067077094', '067077002'];
  const message = 'SMS servis na aplikaciji Frigo Sistem Todosijević je aktiviran';
  
  try {
    // SMS Mobile API zahteva application/x-www-form-urlencoded format
    const data = new URLSearchParams();
    data.append('recipients', recipients.join(','));
    data.append('message', message);
    data.append('apikey', '3153ca534ac7ad8dcdbc21758c7d3af1313e50357f5b7eff');
    data.append('sendername', 'FRIGO SISTEM'); // Sender ID - ime firme

    console.log(`📱 Šaljem SMS na brojeve: ${recipients.join(', ')}`);
    console.log(`📝 Poruka: "${message}"`);
    console.log(`🏢 Sender ID: FRIGO SISTEM`);

    const response = await axios.post('https://api.smsmobileapi.com/sendsms/', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000
    });

    const result = response.data;
    console.log('✅ SMS Mobile API odgovor:', JSON.stringify(result, null, 2));

    if (result.result && result.result.error === 0) {
      console.log('🎉 SMS obaveštenja su uspešno poslata!');
      console.log(`📋 Message ID: ${result.result.id}`);
      console.log(`📄 Status: ${result.result.note}`);
      console.log(`📅 Vreme: ${result.result.datetime}`);
      console.log(`📊 Poslano poruka: ${result.result.sent}`);
    } else {
      console.log('❌ Greška pri slanju SMS-a:', result);
    }

  } catch (error) {
    console.error('❌ Greška:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

// Pokreni slanje
sendActivationSMS();