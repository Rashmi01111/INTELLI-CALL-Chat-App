/**
 * Test final translation with correct port 3010
 */

console.log('🧪 Testing Final Translation with Port 3010...');

const testFinalTranslation = async () => {
  try {
    console.log('📤 Making request to http://localhost:3010/api/ai/translate');
    
    const response = await fetch("http://localhost:3010/api/ai/translate", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text: 'kya h',
        targetLanguage: 'en',
        sourceLanguage: 'hi'
      })
    });
    
    console.log('📥 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📄 Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.text) {
      console.log('✅ Translation SUCCESS:', data.text);
      console.log('🔍 Comparison:');
      console.log('   Original: "kya h"');
      console.log('   Translated: "' + data.text + '"');
      console.log('   Working?:', data.text !== 'kya h');
      
      if (data.text === 'kya h') {
        console.log('❌ ISSUE: Translation returned same text!');
      } else {
        console.log('✅ FIXED: Translation working correctly!');
      }
    } else {
      console.log('❌ Translation FAILED:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Request FAILED:', error.message);
  }
};

// Run the test
testFinalTranslation();
