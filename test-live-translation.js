/**
 * Test translation exactly like the browser would do it
 */

console.log('🧪 Testing live translation like browser...');

// Test the exact same request that ChatPage.tsx is making
const testTranslation = async () => {
  try {
    console.log('📤 Making POST request to /api/ai/translate');
    console.log('📋 Request body:', JSON.stringify({
      text: 'kya kar rahi ho',
      targetLanguage: 'en',
      sourceLanguage: 'hi'
    }, null, 2));
    
    const response = await fetch('http://localhost:3012/api/ai/translate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text: 'kya kar rahi ho',
        targetLanguage: 'en',
        sourceLanguage: 'hi'
      })
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📄 Response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.text) {
      console.log('✅ Translation successful:', data.text);
      console.log('🔍 Original vs Translated:');
      console.log('   Original: "kya kar rahi ho"');
      console.log('   Translated: "' + data.text + '"');
      console.log('   Same?:', data.text === 'kya kar rahi ho');
    } else {
      console.log('❌ Translation failed:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
};

// Run the test
testTranslation();
