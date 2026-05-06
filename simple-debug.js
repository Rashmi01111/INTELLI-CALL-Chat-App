/**
 * Simple debug for translation issue
 */

console.log('🔍 Simple Debug Test...');

// Test the detectLanguage function directly
const detectLanguage = (text) => {
  // Check for Hindi characters (Devanagari range: 0900-097F)
  const hindiRegex = /[\u0900-\u097F]/;
  if (hindiRegex.test(text)) return 'hi';
  
  // Check for common Hindi words written in Roman script
  const commonHindiWords = [
    'kya', 'kar', 'rahi', 'rahe', 'hai', 'ho', 'kaise', 'aap', 'tum', 'mein',
    'nahi', 'accha', 'theek', 'dhanyawad', 'shukriya', 'namaste', 'alvida',
    'maaf', 'kya', 'bahut', 'achha', 'bura', 'kal', 'aaj', 'parson'
  ];
  
  const lowerText = text.toLowerCase();
  const hasHindiWords = commonHindiWords.some(word => lowerText.includes(word));
  
  // If contains Hindi words in Roman script, detect as Hindi
  if (hasHindiWords && lowerText.length > 3) {
    return 'hi';
  }
  
  // Default to English
  return 'en';
};

// Test basic translation
const testTranslation = async () => {
  const originalText = 'kya h';
  const detectedLang = detectLanguage(originalText);
  const target = detectedLang === 'hi' ? 'en' : 'hi';
  
  console.log('📝 Text:', originalText);
  console.log('🔍 Detected:', detectedLang);
  console.log('🎯 Target:', target);
  
  try {
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
    console.log('📄 Response:', data);
    console.log('✅ Success?:', data.success);
    console.log('📋 Translation:', data.text);
    console.log('🔍 Same?:', data.text === originalText);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testTranslation();
