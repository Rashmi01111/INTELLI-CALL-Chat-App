// Test translation API directly
import http from 'http';

const testData = {
  text: "kya kar rahi h",
  targetLanguage: 'en',
  sourceLanguage: 'auto'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3010,
  path: '/api/ai/translate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing translation API...');
console.log('📝 Original text:', testData.text);
console.log('🎯 Target language:', testData.targetLanguage);

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('🌐 Translation result:', response);
      
      if (response.success && response.text) {
        console.log('✅ Translation successful!');
        console.log('📝 Original:', testData.text);
        console.log('🌐 Translated:', response.text);
        
        if (response.text === testData.text) {
          console.log('⚠️ Translation returned same text (might be already in target language)');
        }
      } else {
        console.log('❌ Translation failed:', response.error || 'Unknown error');
      }
    } catch (e) {
      console.log('❌ Failed to parse response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
