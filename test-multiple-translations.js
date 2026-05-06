/**
 * Test multiple translation examples
 */

import http from 'http';

const testCases = [
  { text: 'kesi h', targetLanguage: 'en', sourceLanguage: 'hi' },
  { text: 'kya haal hai', targetLanguage: 'en', sourceLanguage: 'hi' },
  { text: 'namaste', targetLanguage: 'en', sourceLanguage: 'hi' },
  { text: 'theek hai', targetLanguage: 'en', sourceLanguage: 'hi' },
  { text: 'hello', targetLanguage: 'hi', sourceLanguage: 'en' },
  { text: 'how are you', targetLanguage: 'hi', sourceLanguage: 'en' }
];

function testTranslation(testCase, index) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testCase);

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

    console.log(`\n🧪 Test ${index + 1}: ${testCase.sourceLanguage} → ${testCase.targetLanguage}`);
    console.log(`   Text: "${testCase.text}"`);

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success) {
            console.log(`   ✅ Result: "${parsed.text}"`);
            resolve(parsed);
          } else {
            console.log(`   ❌ Error: ${parsed.error}`);
            resolve(parsed);
          }
        } catch (e) {
          console.log(`   ❌ Invalid JSON response`);
          resolve({ error: 'Invalid JSON' });
        }
      });
    });

    req.on('error', (e) => {
      console.error(`   ❌ Request error: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function runAllTests() {
  console.log('🌐 Testing Multiple Translation Examples...\n');
  
  for (let i = 0; i < testCases.length; i++) {
    try {
      await testTranslation(testCases[i], i);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Test ${i + 1} failed:`, error.message);
    }
  }
  
  console.log('\n✅ All translation tests completed!');
}

runAllTests();
