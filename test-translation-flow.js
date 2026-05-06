/**
 * Test the complete translation flow to find the exact issue
 */

console.log('🔍 Testing Complete Translation Flow...');

// Test step by step
const testStepByStep = async () => {
  const originalText = 'kya h';
  console.log('📝 Original:', originalText);
  
  // Step 1: Test detectLanguage
  const detectLanguage = (text) => {
    const hindiRegex = /[\u0900-\u097F]/;
    if (hindiRegex.test(text)) return 'hi';
    
    const commonHindiWords = [
      'kya', 'kar', 'rahi', 'rahe', 'hai', 'ho', 'kaise', 'aap', 'tum', 'mein',
      'nahi', 'accha', 'theek', 'dhanyawad', 'shukriya', 'namaste', 'alvida',
      'maaf', 'kya', 'bahut', 'achha', 'bura', 'kal', 'aaj', 'parson'
    ];
    
    const lowerText = text.toLowerCase();
    const hasHindiWords = commonHindiWords.some(word => lowerText.includes(word));
    
    if (hasHindiWords && lowerText.length > 3) {
      return 'hi';
    }
    
    return 'en';
  };
  
  const detectedLang = detectLanguage(originalText);
  const target = detectedLang === 'hi' ? 'en' : 'hi';
  
  console.log('🔍 Detection Result:', { detected: detectedLang, target });
  
  // Step 2: Test MyMemory API directly
  try {
    console.log('🌐 Testing MyMemory API...');
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(originalText)}&langpair=${detectedLang}|${target}`;
    
    const myMemoryResponse = await fetch(myMemoryUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'IntelliCall-Translation/1.0' }
    });
    
    const myMemoryData = await myMemoryResponse.json();
    console.log('📄 MyMemory Response:', myMemoryData);
    
    if (myMemoryData.responseStatus === 200 && myMemoryData.responseData && myMemoryData.responseData.translatedText) {
      const translatedText = myMemoryData.responseData.translatedText.trim();
      console.log('✅ MyMemory Translation:', translatedText);
      console.log('🔍 Same as original?', translatedText === originalText);
      
      if (translatedText !== originalText) {
        console.log('🎯 MyMemory WORKS for "kya h"!');
        return;
      }
    }
    
    console.log('⚠️ MyMemory failed for "kya h"');
  } catch (error) {
    console.error('❌ MyMemory Error:', error.message);
  }
  
  // Step 3: Test basic translation
  console.log('📚 Testing basic Hindi-English translation...');
  const basicTranslations = {
    'kya h': 'what are you',
    'kya': 'what',
    'hello': 'namaste'
  };
  
  if (basicTranslations[originalText]) {
    console.log('✅ Basic Translation:', basicTranslations[originalText]);
    console.log('🎯 Basic Translation WORKS for "kya h"!');
    return;
  }
  
  console.log('❌ Both MyMemory and basic translation failed for "kya h"');
};

// Run the test
testStepByStep();
