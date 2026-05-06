/**
 * Debug translation API to find the exact issue
 */

import http from 'http';

console.log('🔍 Debugging Translation API...');

// Test 1: Direct API call
const testData = {
  text: 'kya kar rahi ho',
  targetLanguage: 'en',
  sourceLanguage: 'hi'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3012,
  path: '/api/ai/translate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('📤 Request Data:', postData);
console.log('🔗 Endpoint: http://localhost:3012/api/ai/translate');

const req = http.request(options, (res) => {
  console.log(`📥 Status: ${res.statusCode}`);
  console.log(`📋 Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Raw Response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('✅ Parsed Response:', JSON.stringify(parsed, null, 2));
      if (parsed.success && parsed.text) {
        console.log('🎯 Translation Result:', parsed.text);
      } else {
        console.log('❌ Translation failed:', parsed.error || 'Unknown error');
      }
    } catch (e) {
      console.log('❌ JSON Parse Error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request Error: ${e.message}`);
});

req.write(postData);
req.end();
