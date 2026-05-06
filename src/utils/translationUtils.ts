/**
 * Message Translation Utility
 * Handles translation of messages for both sender and receiver sides
 */

import { SUPPORTED_LANGUAGES } from '../hooks/useCallTranslator';

interface TranslationResponse {
  success: boolean;
  text?: string;
  error?: string;
  targetLanguage?: string;
  sourceLanguage?: string;
}

/**
 * Translate a single message
 * @param text - Text to translate
 * @param targetLanguage - Target language code (e.g., 'hi', 'es', 'en')
 * @param sourceLanguage - Source language code or 'auto' for auto-detection
 * @returns Promise<string> - Translated text or original if translation fails
 */
export const translateMessage = async (
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'auto',
  retryCount: number = 0
): Promise<string> => {
  if (!text || !text.trim()) {
    return text;
  }

  // If source and target are the same, no translation needed
  if (sourceLanguage !== 'auto' && sourceLanguage === targetLanguage) {
    return text;
  }

  const MAX_RETRIES = 2;

  try {
    console.log(`🌐 Translating message: ${sourceLanguage} → ${targetLanguage}`);
    console.log(`   Text: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text: text.trim(),
        targetLanguage,
        sourceLanguage: sourceLanguage || 'auto',
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    console.log(`📤 API Response Status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: TranslationResponse = await response.json().catch((err) => {
      console.error('❌ Failed to parse response JSON:', err);
      return { success: false, error: 'Invalid response format' };
    });

    console.log('📥 Translation Response:', {
      success: data.success,
      hasText: !!data.text,
      textLength: data.text?.length,
      error: data.error
    });

    if (!data.success) {
      throw new Error(data.error || 'Translation failed');
    }

    const translatedText = (data.text || '').trim();

    if (!translatedText) {
      console.warn('⚠️ Empty translation received');
      return text;
    }

    console.log(`✅ Translation successful`);
    console.log(`   Original: ${text.slice(0, 40)}${text.length > 40 ? '...' : ''}`);
    console.log(`   Translated: ${translatedText.slice(0, 40)}${translatedText.length > 40 ? '...' : ''}`);

    return translatedText;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`⚠️ Translation error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, errorMessage);

    // Retry on network errors
    if (retryCount < MAX_RETRIES && (
      error instanceof TypeError || 
      (error instanceof DOMException && error.name === 'AbortError')
    )) {
      const delayMs = 600 * (retryCount + 1);
      console.log(`🔄 Retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
      return translateMessage(text, targetLanguage, sourceLanguage, retryCount + 1);
    }

    console.log('❌ Translation failed, using original text');
    return text;
  }
};

/**
 * Translate multiple messages efficiently using batch endpoint
 * @param texts - Array of texts to translate
 * @param targetLanguage - Target language code
 * @param sourceLanguage - Source language code or 'auto'
 * @returns Promise<string[]> - Array of translated texts
 */
export const translateMessagesBatch = async (
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string = 'auto'
): Promise<string[]> => {
  if (!texts || texts.length === 0) {
    return [];
  }

  // Filter out empty texts
  const nonEmptyTexts = texts.filter(t => t && t.trim());
  if (nonEmptyTexts.length === 0) {
    return texts;
  }

  try {
    console.log(`🌐 Batch translating ${nonEmptyTexts.length} messages: ${sourceLanguage} → ${targetLanguage}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('/api/ai/translate-batch', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        texts: nonEmptyTexts,
        targetLanguage,
        sourceLanguage: sourceLanguage || 'auto',
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.texts)) {
      throw new Error('Invalid batch response');
    }

    console.log(`✅ Batch translation completed: ${data.count} messages`);

    // Reconstruct with original empty texts in correct positions
    return texts.map(originalText => {
      if (!originalText || !originalText.trim()) {
        return originalText;
      }
      return data.texts.shift() || originalText;
    });
  } catch (error) {
    console.error('❌ Batch translation failed:', error);
    return texts; // Return originals on failure
  }
};

/**
 * Get language display name and flag
 * @param code - Language code (e.g., 'hi', 'es')
 * @returns Object with name and flag emoji
 */
export const getLanguageInfo = (code: string) => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang || { code, name: code.toUpperCase(), flag: '🌐' };
};

/**
 * Check if translation service is available
 * @returns Promise<boolean>
 */
export const checkTranslationServiceHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/ai/translate/health');
    const data = await response.json();
    console.log('🏥 Translation Service Health:', data);
    return data.status === 'healthy' && data.openaiConfigured;
  } catch (error) {
    console.error('❌ Translation service health check failed:', error);
    return false;
  }
};

/**
 * Format message for display with translation info
 */
export const formatMessageDisplay = (
  originalText: string,
  translatedText?: string,
  targetLanguage?: string
): {
  displayText: string;
  showOriginal: boolean;
  original?: string;
  translated?: string;
  language?: string;
} => {
  // Show translated text if available
  if (translatedText && translatedText !== originalText) {
    return {
      displayText: translatedText,
      showOriginal: true,
      original: originalText,
      translated: translatedText,
      language: targetLanguage
    };
  }

  // Show original if no translation
  return {
    displayText: originalText,
    showOriginal: false,
    original: originalText
  };
};

export default {
  translateMessage,
  translateMessagesBatch,
  getLanguageInfo,
  checkTranslationServiceHealth,
  formatMessageDisplay
};
