/**
 * Simple Translation Service using MyMemory API (Free)
 * Fallback translation service when paid APIs are not available
 */

// Language mapping for MyMemory API
const languageMap = {
  en: 'en',
  hi: 'hi',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  pt: 'pt',
  ru: 'ru',
  ja: 'ja',
  ko: 'ko',
  zh: 'zh',
  ar: 'ar',
  tr: 'tr',
  vi: 'vi',
  th: 'th',
  id: 'id',
  ta: 'ta',
  te: 'te',
  mr: 'mr',
  bn: 'bn',
  gu: 'gu',
  kn: 'kn',
  ml: 'ml',
  pa: 'pa',
  ur: 'ur'
};

/**
 * Translate text using MyMemory free API
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceLanguage - Source language code or 'auto'
 * @returns {Promise<string>} - Translated text
 */
async function translateWithMyMemory(text, targetLanguage, sourceLanguage = 'auto') {
  const trimmed = (text || '').trim();
  if (!trimmed) return text;

  const targetLang = languageMap[targetLanguage] || targetLanguage;
  let sourceLang = sourceLanguage === 'auto' ? 'auto' : (languageMap[sourceLanguage] || sourceLanguage);

  // MyMemory API endpoint
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${sourceLang}|${targetLang}`;
  
  try {
    console.log(`🌐 MyMemory Translation: ${sourceLang} → ${targetLang}`);
    console.log(`   Text: ${trimmed.slice(0, 50)}${trimmed.length > 50 ? '...' : ''}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'IntelliCall-Translation/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
      const translatedText = data.responseData.translatedText.trim();
      
      // Check if translation actually happened
      if (translatedText && translatedText !== trimmed) {
        console.log(`✅ MyMemory Translation successful`);
        console.log(`   Result: ${translatedText.slice(0, 40)}${translatedText.length > 40 ? '...' : ''}`);
        return translatedText;
      }
    }

    console.warn('⚠️ MyMemory returned no translation or same text');
    return trimmed;
  } catch (error) {
    console.warn('⚠️ MyMemory translation failed:', error.message);
    return trimmed;
  }
}

/**
 * Simple translation function with fallback
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceLanguage - Source language code or 'auto'
 * @returns {Promise<string>} - Translated text
 */
export async function translateTextSimple(text, targetLanguage, sourceLanguage = 'auto') {
  if (!text || !text.trim()) {
    return text;
  }

  // If source and target are the same, no translation needed
  if (sourceLanguage !== 'auto' && sourceLanguage === targetLanguage) {
    return text;
  }

  console.log(`🔄 Starting simple translation: ${sourceLanguage} → ${targetLanguage}`);
  
  // For very short Hindi phrases, use basic translation first (MyMemory fails on short text)
  const lowerText = text.toLowerCase().trim();
  if (lowerText.length <= 8 && (lowerText.includes('kya') || lowerText === 'kya h' || lowerText === 'kesi h')) {
    const basicTranslations = {
      'kya h': 'how are you',
      'kesi h': 'how are you',
      'kaise h': 'how are you',
      'kya': 'what',
      'kya kar rahi h': 'what are you doing',
      'kya kar rahe h': 'what are you doing',
      'kya ho': 'how are you',
      'kaise ho': 'how are you'
    };
    
    if (basicTranslations[lowerText] && targetLanguage === 'en') {
      console.log(`✅ Short phrase translation: "${lowerText}" → "${basicTranslations[lowerText]}"`);
      return basicTranslations[lowerText];
    }
  }
  
  // Try MyMemory for longer text
  try {
    const result = await translateWithMyMemory(text, targetLanguage, sourceLanguage);
    if (result && result !== text) {
      return result;
    }
  } catch (error) {
    console.warn('MyMemory failed, trying fallback');
  }

  // Enhanced basic Hindi-English translation for very short phrases
  const basicTranslations = {
    // Hindi to English
    hi_to_en: {
      'kya kar rahi ho': 'what are you doing',
      'kya kar rahe ho': 'what are you doing',
      'kya haal hai': 'how are you',
      'kya hal hai': 'how are you',
      'kya h': 'how are you',
      'kesi h': 'how are you',
      'kaise ho': 'how are you',
      'kya kar rahi h': 'what are you doing',
      'kya kar rahe h': 'what are you doing',
      'namaste': 'hello',
      'dhanyawad': 'thank you',
      'shukriya': 'thank you',
      'theek hai': 'okay',
      'accha': 'good',
      'bahut accha': 'very good',
      'kal milte hain': 'see you tomorrow',
      'alvida': 'goodbye',
      'maaf karo': 'sorry',
      'kya baat hai': 'what\'s up',
      'bahut khush': 'very happy',
      'mainek hun': 'i am fine',
      'aap kaise ho': 'how are you',
      'mein achhi hun': 'i am good',
      'aapka din kaisa raha': 'how was your day',
      'kya chal raha hai': 'what\'s going on',
      'kya scene hai': 'what\'s up',
      'bilkul theek': 'perfectly fine',
      'sab theek': 'everything is fine',
      'mein theek hun': 'i am fine',
      'tu kaisa hai': 'how are you',
      'tum kaise ho': 'how are you',
      'kya baat': 'wow',
      'waah': 'wow',
      'mast hai': 'awesome',
      'badhiya': 'excellent',
      'bahut badiya': 'very good'
    },
    // English to Hindi
    en_to_hi: {
      'what are you doing': 'kya kar rahi ho',
      'how are you': 'kya haal hai',
      'hello': 'namaste',
      'thank you': 'dhanyawad',
      'thanks': 'dhanyawad',
      'okay': 'theek hai',
      'good': 'accha',
      'very good': 'bahut accha',
      'see you tomorrow': 'kal milte hain',
      'goodbye': 'alvida',
      'sorry': 'maaf karo',
      'what\'s up': 'kya baat hai',
      'i am fine': 'mainek hun',
      'how was your day': 'aapka din kaisa raha'
    }
  };

  const dict = targetLanguage === 'en' ? basicTranslations.hi_to_en : basicTranslations.en_to_hi;
  
  // Check exact matches first
  if (dict[lowerText]) {
    console.log(`✅ Basic translation found: "${lowerText}" → "${dict[lowerText]}"`);
    return dict[lowerText];
  }

  // Check partial matches for longer text
  if (lowerText.length > 3) {
    for (const [key, value] of Object.entries(dict)) {
      if (lowerText.includes(key) || key.includes(lowerText)) {
        console.log(`✅ Partial translation found: "${lowerText}" → "${value}"`);
        return value;
      }
    }
  }

  // For very short text (3 chars or less), use enhanced logic
  if (lowerText.length <= 3) {
    // Special handling for very short Hindi phrases
    if (targetLanguage === 'en') {
      if (lowerText === 'kya' || lowerText === 'kya h') {
        console.log(`✅ Short phrase translation: "${lowerText}" → "what are you"`);
        return 'what are you';
      }
    } else if (targetLanguage === 'hi') {
      if (lowerText === 'how' || lowerText === 'how r') {
        console.log(`✅ Short phrase translation: "${lowerText}" → "कैसे"`);
        return 'कैसे';
      }
    }
  }

  console.warn(`⚠️ No translation found for "${text}"`);
  return text;
}

/**
 * Batch translation using simple method
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceLanguage - Source language code or 'auto'
 * @returns {Promise<string[]>} - Array of translated texts
 */
export async function batchTranslateTextSimple(texts, targetLanguage, sourceLanguage = 'auto') {
  if (!texts || texts.length === 0) {
    return [];
  }

  const results = [];
  for (const text of texts) {
    const translated = await translateTextSimple(text, targetLanguage, sourceLanguage);
    results.push(translated);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

export default {
  translateTextSimple,
  batchTranslateTextSimple
};
