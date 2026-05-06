/**
 * Test complete translation flow like ChatPage.tsx
 */

// Copy the exact logic from ChatPage.tsx
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

// Test complete translation flow
const testCompleteTranslation = async () => {
  console.log('🧪 Testing Complete Translation Flow:');
  console.log('='.repeat(50));
  
  const originalText = 'kya kar rahi h';
  console.log('📝 Original Text:', originalText);
  
  // Step 1: Detect language
  const detectedLang = detectLanguage(originalText);
  console.log('🔍 Detected Language:', detectedLang);
  
  // Step 2: Determine target language
  const target = detectedLang === 'hi' ? 'en' : 'hi';
  console.log('🎯 Target Language:', target);
  
  // Step 3: Make API call
  try {
    console.log('📤 Making API request...');
    const response = await fetch('http://localhost:3012/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: originalText.trim(),
        targetLanguage: target,
        sourceLanguage: detectedLang
      })
    });
    
    console.log('📥 Response Status:', response.status);
    
    const data = await response.json();
    console.log('📄 Response Data:', JSON.stringify(data, null, 2));
    
    // Step 4: Check result
    if (!response.ok || !data?.success) {
      console.log('❌ Translation Failed:', data?.error || 'Unknown error');
      return;
    }
    
    if (!data.text || typeof data.text !== 'string') {
      console.log('❌ Invalid Translation Response');
      return;
    }
    
    const translatedText = data.text.trim();
    console.log('✅ Translation Successful!');
    console.log('📋 Summary:');
    console.log('   Original:', originalText);
    console.log('   Detected:', detectedLang);
    console.log('   Target:', target);
    console.log('   Translated:', translatedText);
    console.log('   Same as Original?:', translatedText === originalText);
    
  } catch (error) {
    console.error('❌ Translation Error:', error.message);
  }
};

// Run the test
testCompleteTranslation();
