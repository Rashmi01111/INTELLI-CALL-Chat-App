// Quick translation test with both OpenAI and Gemini
import dotenv from 'dotenv';
dotenv.config();

import { translateText } from './server/services/translatorService.js';

async function testTranslation() {
  try {
    console.log('🧪 Testing translation...');
    
    const hindiText = "kya kar rahi h";
    console.log('📝 Original:', hindiText);
    
    // Test with both services
    const translation = await translateText(hindiText, 'en', 'auto');
    console.log('🌐 Translation:', translation);
    
    if (translation === hindiText) {
      console.log('❌ Translation failed - same text returned');
      console.log('💡 This might be a valid translation if the text is already in target language');
    } else {
      console.log('✅ Translation working!');
    }
    
    // Test with different text
    console.log('\n🧪 Testing with different text...');
    const testText = "नमस्ते आप कैसे हैं";
    const translation2 = await translateText(testText, 'en', 'auto');
    console.log('📝 Original:', testText);
    console.log('🌐 Translation:', translation2);
    
  } catch (error) {
    console.error('❌ Translation error:', error.message);
    console.log('💡 Both OpenAI and Gemini should be available as fallback');
  }
}

testTranslation();
