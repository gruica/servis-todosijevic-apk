import axios from 'axios';

async function testSMSMobileAPI() {
  console.log('🚀 Testiranje SMS Mobile API direktno...');
  
  try {
    // SMS Mobile API zahteva application/x-www-form-urlencoded format
    const formData = new URLSearchParams();
    formData.append('recipients', '38267051141');
    formData.append('message', 'Test SMS iz Frigo Sistem aplikacije - direktan test!');
    formData.append('apikey', '3153ca534ac7ad8dcdbc21758c7d3af1313e50357f5b7eff');

    console.log('📱 Šaljem SMS na 38267051141...');
    
    const response = await axios.post(
      'https://api.smsmobileapi.com/sendsms/',
      formData,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ SMS Mobile API odgovor:', JSON.stringify(response.data, null, 2));
    
    const result = response.data.result || response.data;
    
    if (result.error === 0 || result.error === "0") {
      console.log('🎉 SMS uspešno poslat!');
      console.log(`📋 Message ID: ${result.id}`);
      console.log(`📄 Status: ${result.note}`);
      console.log(`📅 Vreme: ${result.datetime}`);
    } else {
      console.log('❌ Greška pri slanju SMS-a:', result);
    }
    
  } catch (error) {
    console.error('💥 Greška:', error.message);
    if (error.response) {
      console.error('🔍 Response:', error.response.data);
    }
  }
}

testSMSMobileAPI();