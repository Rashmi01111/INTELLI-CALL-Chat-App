/**
 * Test translation API endpoint
 */

import http from 'http';

const testData = {
  text: 'kesi h',
  targetLanguage: 'en',
  sourceLanguage: 'hi'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3009,
  path: '/api/ai/translate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing Translation API Endpoint...');
console.log('Request:', postData);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('✅ Translation Result:', parsed.text);
    } catch (e) {
      console.log('❌ Invalid JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
});

req.write(postData);
req.end();
