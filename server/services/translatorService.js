import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { OpenAI } from 'openai';
import { translateTextSimple } from './simpleTranslator.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const gemini = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const activeServices = [];
if (openai) activeServices.push('OpenAI');
if (gemini) activeServices.push('Gemini');
if (activeServices.length === 0) {
  console.log('🌐 Using Google Translate API (free) - no API keys required');
}

const languageMap = {
  en: 'English',
  hi: 'Hindi',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  bn: 'Bengali',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu'
};

// Google Translate API (free) - Primary method
async function translateWithGoogle(text, targetLanguage, sourceLanguage = 'auto') {
  const trimmed = (text || '').trim();
  if (!trimmed) return text;

  const targetLang = targetLanguage || 'en';
  const sourceLang = sourceLanguage === 'auto' ? 'auto' : sourceLanguage;

  try {
    console.log(`🌐 Google Translate: ${sourceLang} → ${targetLang}`);
    console.log(`   Text: ${trimmed.slice(0, 50)}${trimmed.length > 50 ? '...' : ''}`);

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
    
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
    
    if (Array.isArray(data?.[0])) {
      const translated = data[0].map((chunk) => chunk?.[0]).filter(Boolean).join('');
      const translatedText = (translated || '').trim();
      
      if (translatedText && translatedText !== trimmed) {
        console.log(`✅ Google Translate successful`);
        console.log(`   Result: ${translatedText.slice(0, 40)}${translatedText.length > 40 ? '...' : ''}`);
        return translatedText;
      }
    }

    console.warn('⚠️ Google Translate returned no translation or same text');
    return trimmed;
  } catch (error) {
    console.warn('⚠️ Google Translate failed:', error.message);
    return trimmed;
  }
}

function buildTranslationPrompt(text, targetLanguage, sourceLanguage) {
  const targetLangName = languageMap[targetLanguage] || targetLanguage;
  const sourceLangName = sourceLanguage === 'auto' ? 'auto-detected language' : (languageMap[sourceLanguage] || sourceLanguage);

  return sourceLanguage === 'auto'
    ? `Translate the following text to ${targetLangName}. Respond with ONLY the translated text, no explanations. If the text is already in ${targetLangName}, return it unchanged.\n\n${text}`
    : `Translate the following ${sourceLangName} text to ${targetLangName}. Respond with ONLY the translated text, no explanations. If the text is already in ${targetLangName}, return it unchanged.\n\n${text}`;
}

async function translateWithOpenAI(prompt) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a professional translator. Provide accurate, natural translations without any additional commentary. Maintain the tone and context of the original message.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 500,
    temperature: 0.3,
    timeout: 10000
  });

  return response.choices?.[0]?.message?.content?.trim() || '';
}

async function translateWithGemini(prompt) {
  if (!gemini) {
    throw new Error('Gemini API key not configured');
  }

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 500
    }
  });

  return response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

async function translateText(text, targetLanguage, sourceLanguage = 'auto') {
  if (!text || !text.trim()) {
    return text;
  }

  if (sourceLanguage !== 'auto' && sourceLanguage === targetLanguage) {
    return text;
  }

  console.log(`🔄 Starting translation: ${sourceLanguage} → ${targetLanguage}`);
  let lastError = null;

  // For Hindi to English translations, try simple translator first (better quality for common phrases)
  if ((sourceLanguage === 'hi' || sourceLanguage === 'auto') && targetLanguage === 'en') {
    console.log('🔄 Trying simple translator first for Hindi to English...');
    try {
      const simpleResult = await translateTextSimple(text, targetLanguage, sourceLanguage);
      if (simpleResult && simpleResult !== text && simpleResult.trim()) {
        console.log('✅ Simple translator successful for Hindi to English');
        return simpleResult.trim();
      }
    } catch (simpleError) {
      console.warn('⚠️ Simple translator failed:', simpleError.message);
    }
  }

  // Primary: Use Google Translate API (free, no API key required)
  try {
    console.log('🌐 Using Google Translate API (primary)...');
    const translatedText = await translateWithGoogle(text, targetLanguage, sourceLanguage);
    if (translatedText && translatedText.trim() && translatedText !== text) {
      console.log('✅ Google Translate successful');
      return translatedText.trim();
    }
    console.warn('⚠️ Google Translate returned same text, trying AI fallbacks');
  } catch (error) {
    console.warn('⚠️ Google Translate failed:', error?.message || error);
    lastError = error;
  }

  // Fallback 1: Google Gemini API if available
  if (gemini) {
    try {
      console.log('🔄 Trying Gemini API fallback...');
      const prompt = buildTranslationPrompt(text, targetLanguage, sourceLanguage);
      const translatedText = await translateWithGemini(prompt);
      if (translatedText && translatedText.trim() && translatedText !== text) {
        console.log('✅ Gemini translation successful');
        return translatedText.trim();
      }
      console.warn('⚠️ Gemini returned empty translation');
    } catch (error) {
      console.warn('⚠️ Gemini translation failed:', error?.message || error);
      lastError = error;
    }
  }

  // Fallback 2: OpenAI API if available
  if (openai) {
    try {
      console.log('🔄 Trying OpenAI API fallback...');
      const prompt = buildTranslationPrompt(text, targetLanguage, sourceLanguage);
      const translatedText = await translateWithOpenAI(prompt);
      if (translatedText && translatedText.trim() && translatedText !== text) {
        console.log('✅ OpenAI translation successful');
        return translatedText.trim();
      }
      console.warn('⚠️ OpenAI returned empty translation');
    } catch (error) {
      console.warn('⚠️ OpenAI translation failed:', error?.message || error);
      lastError = error;
    }
  }

  // Fallback 3: Simple translator (for other language pairs)
  console.log('🔄 Trying simple translator fallback...');
  try {
    const fallbackResult = await translateTextSimple(text, targetLanguage, sourceLanguage);
    if (fallbackResult && fallbackResult !== text && fallbackResult.trim()) {
      console.log('✅ Simple translator fallback successful');
      return fallbackResult.trim();
    }
  } catch (fallbackError) {
    console.warn('⚠️ Simple translator also failed:', fallbackError.message);
  }

  // If all methods failed, return original text
  if (lastError) {
    console.warn('⚠️ All translation methods failed, returning original text');
    return text;
  }

  console.warn('⚠️ No translation could be performed, returning original text');
  return text;
}

async function batchTranslateText(texts, targetLanguage, sourceLanguage = 'auto') {
  if (!texts || texts.length === 0) {
    return [];
  }

  const nonEmptyTexts = texts.filter(t => t && t.trim());
  if (nonEmptyTexts.length === 0) {
    return texts;
  }

  console.log(`🔄 Starting batch translation: ${nonEmptyTexts.length} texts, ${sourceLanguage} → ${targetLanguage}`);
  let lastError = null;

  // Primary: Use Google Translate API for each text (free, no API key required)
  try {
    console.log('🌐 Using Google Translate API for batch translation (primary)...');
    const googleResults = await Promise.all(
      nonEmptyTexts.map(text => translateWithGoogle(text, targetLanguage, sourceLanguage))
    );
    
    const validResults = googleResults.filter((result, index) => 
      result && result.trim() && result !== nonEmptyTexts[index]
    );
    
    if (validResults.length === nonEmptyTexts.length) {
      console.log('✅ Google Translate batch translation successful');
      return texts.map((original, index) => {
        const nonEmptyIndex = nonEmptyTexts.indexOf(original);
        return nonEmptyIndex >= 0 ? googleResults[nonEmptyIndex] : original;
      });
    }
    console.warn('⚠️ Google Translate batch had some failures, trying AI fallbacks');
  } catch (error) {
    console.warn('⚠️ Google Translate batch failed:', error?.message || error);
    lastError = error;
  }

  // Fallback 1: Google Gemini API if available
  if (gemini) {
    try {
      console.log('🔄 Trying Gemini API for batch translation...');
      const targetLangName = languageMap[targetLanguage] || targetLanguage;
      const sourceLangName = sourceLanguage === 'auto' ? 'auto-detected language' : (languageMap[sourceLanguage] || sourceLanguage);
      const promptText = nonEmptyTexts.map((t, i) => `${i + 1}. ${t}`).join('\n');
      const prompt = sourceLanguage === 'auto'
        ? `Translate the following ${nonEmptyTexts.length} texts to ${targetLangName}. Respond with ONLY the translated texts in the same numbered format, no explanations.\n\n${promptText}`
        : `Translate the following ${sourceLangName} texts to ${targetLangName}. Respond with ONLY the translated texts in the same numbered format, no explanations.\n\n${promptText}`;

      const translatedContent = await translateWithGemini(prompt);
      if (translatedContent && translatedContent.trim()) {
        console.log('✅ Gemini batch translation successful');
        
        // Parse the numbered response
        const lines = translatedContent.trim().split('\n').filter(line => line.trim());
        const translations = [];

        for (let i = 0; i < nonEmptyTexts.length; i++) {
          const line = lines[i];
          if (line && line.includes('.')) {
            const translation = line.substring(line.indexOf('.') + 1).trim();
            translations.push(translation || nonEmptyTexts[i]);
          } else {
            translations.push(nonEmptyTexts[i]);
          }
        }

        return texts.map((original, index) => {
          const nonEmptyIndex = nonEmptyTexts.indexOf(original);
          return nonEmptyIndex >= 0 ? translations[nonEmptyIndex] : original;
        });
      }
      console.warn('⚠️ Gemini batch translation returned empty result');
    } catch (error) {
      console.warn('⚠️ Gemini batch translation failed:', error?.message || error);
      lastError = error;
    }
  }

  // Fallback 2: OpenAI API if available
  if (openai) {
    try {
      console.log('🔄 Trying OpenAI API for batch translation...');
      const targetLangName = languageMap[targetLanguage] || targetLanguage;
      const sourceLangName = sourceLanguage === 'auto' ? 'auto-detected language' : (languageMap[sourceLanguage] || sourceLanguage);
      const promptText = nonEmptyTexts.map((t, i) => `${i + 1}. ${t}`).join('\n');
      const prompt = sourceLanguage === 'auto'
        ? `Translate the following ${nonEmptyTexts.length} texts to ${targetLangName}. Respond with ONLY the translated texts in the same numbered format, no explanations.\n\n${promptText}`
        : `Translate the following ${sourceLangName} texts to ${targetLangName}. Respond with ONLY the translated texts in the same numbered format, no explanations.\n\n${promptText}`;

      const translatedContent = await translateWithOpenAI(prompt);
      if (translatedContent && translatedContent.trim()) {
        console.log('✅ OpenAI batch translation successful');
        
        // Parse the numbered response
        const lines = translatedContent.trim().split('\n').filter(line => line.trim());
        const translations = [];

        for (let i = 0; i < nonEmptyTexts.length; i++) {
          const line = lines[i];
          if (line && line.includes('.')) {
            const translation = line.substring(line.indexOf('.') + 1).trim();
            translations.push(translation || nonEmptyTexts[i]);
          } else {
            translations.push(nonEmptyTexts[i]);
          }
        }

        return texts.map((original, index) => {
          const nonEmptyIndex = nonEmptyTexts.indexOf(original);
          return nonEmptyIndex >= 0 ? translations[nonEmptyIndex] : original;
        });
      }
      console.warn('⚠️ OpenAI batch translation returned empty result');
    } catch (error) {
      console.warn('⚠️ OpenAI batch translation failed:', error?.message || error);
      lastError = error;
    }
  }

  // Fallback 3: Simple translator
  console.log('🔄 Trying simple translator for batch translation...');
  try {
    const fallbackResults = await Promise.all(
      texts.map(text => translateTextSimple(text, targetLanguage, sourceLanguage))
    );
    console.log('✅ Simple translator batch fallback successful');
    return fallbackResults;
  } catch (fallbackError) {
    console.warn('⚠️ Simple translator batch fallback also failed:', fallbackError.message);
  }

  // If all methods failed, return original texts
  if (lastError) {
    console.warn('⚠️ All batch translation methods failed, returning original texts');
    return texts;
  }

  console.warn('⚠️ No batch translation could be performed, returning original texts');
  return texts;
}

export { translateText, batchTranslateText };
