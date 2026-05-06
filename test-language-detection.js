/**
 * Test the improved detectLanguage function
 */

// Copy the exact detectLanguage function from ChatPage.tsx
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

// Test various inputs
const testCases = [
  'kya kar rahi ho',
  'kya kar rahi h', 
  'how are you',
  'namaste',
  'hello',
  'theek hai',
  'it is okay'
];

console.log('🧪 Testing Language Detection:');
console.log('='.repeat(40));

testCases.forEach((text, index) => {
  const detected = detectLanguage(text);
  const target = detected === 'hi' ? 'en' : 'hi';
  console.log(`${index + 1}. "${text}"`);
  console.log(`   Detected: ${detected} → Target: ${target}`);
  console.log('');
});

console.log('✅ Language detection test complete!');
