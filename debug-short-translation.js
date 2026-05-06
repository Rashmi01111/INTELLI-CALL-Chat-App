/**
 * Debug why short text like "kya h" is not being translated
 */

console.log('🔍 Debugging Short Translation Issue...');

// Test the exact translation flow step by step
const debugShortTranslation = async () => {
  const originalText = 'kya h';
  console.log('📝 Original Text:', originalText);
  
  // Step 1: Language detection
  const { detectLanguage } = await import('./src/pages/ChatPage.tsx');
  const detectedLang = detectLanguage(originalText);
  console.log('🔍 Detected Language:', detectedLang);
  
  // Step 2: Target language
  const target = detectedLang === 'hi' ? 'en' : 'hi';
  console.log('🎯 Target Language:', target);
  
  // Step 3: Direct API call
  try {
    console.log('📤 Making direct API call...');
    const response = await fetch('http://localhost:3012/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: originalText,
        targetLanguage: target,
        sourceLanguage: detectedLang
      })
    });
    
    const data = await response.json();
    console.log('📄 Full Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.text) {
      console.log('✅ API Translation Result:', data.text);
      console.log('🔍 Is Same as Original?', data.text === originalText);
      
      // Step 4: Check if simple translator is being used
      if (data.text === originalText) {
        console.log('⚠️  Simple translator fallback likely used');
        
        // Test simple translator directly
        const { translateTextSimple } = await import('./server/services/simpleTranslator.js');
        const simpleResult = await translateTextSimple(originalText, target, detectedLang);
        console.log('🛠️  Simple Translator Result:', simpleResult);
        console.log('🔍  Simple Same as Original?', simpleResult === originalText);
      }
    } else {
      console.log('❌ API Failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Debug Error:', error.message);
  }
};

debugShortTranslation();
