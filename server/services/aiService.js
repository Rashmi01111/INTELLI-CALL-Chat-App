import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

// Initialize AI clients
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

// GROQ as third fallback
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Make request to Gemini API (Primary)
 * @param {string} prompt - The prompt to send
 * @param {number} maxTokens - Maximum tokens (not used for Gemini but kept for API consistency)
 * @param {number} temperature - Temperature (0-1)
 * @returns {Promise<string>} - Generated text
 */
async function callGemini(prompt, maxTokens = 200, temperature = 0.7) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
      }
    });

    return response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

/**
 * Fallback to OpenAI if Gemini fails
 */
async function callOpenAI(prompt, maxTokens = 200, temperature = 0.7) {
  if (!openai) {
    throw new Error('No AI service configured');
  }

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: maxTokens,
    temperature: temperature,
  });

  return response.choices[0]?.message?.content?.trim() || '';
}

/**
 * Third fallback to GROQ if both Gemini and OpenAI fail
 */
async function callGroq(prompt, maxTokens = 200, temperature = 0.7) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`GROQ API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Generate text using Gemini (primary) with OpenAI fallback, then GROQ
 */
async function generateWithFallback(prompt, maxTokens = 200, temperature = 0.7) {
  // Try Gemini first (Primary)
  if (genAI) {
    try {
      console.log('🤖 Using Gemini AI for generation...');
      const result = await callGemini(prompt, maxTokens, temperature);
      if (result) {
        console.log('✅ Gemini response generated successfully');
        return result;
      }
    } catch (error) {
      console.warn('⚠️ Gemini failed, falling back to OpenAI:', error.message);
    }
  }

  // Fallback to OpenAI
  if (openai) {
    try {
      console.log('🔄 Falling back to OpenAI...');
      const result = await callOpenAI(prompt, maxTokens, temperature);
      if (result) {
        console.log('✅ OpenAI fallback response generated');
        return result;
      }
    } catch (error) {
      console.warn('⚠️ OpenAI failed, falling back to GROQ:', error.message);
    }
  }

  // Third fallback to GROQ
  if (GROQ_API_KEY) {
    try {
      console.log('🔄 Falling back to GROQ...');
      const result = await callGroq(prompt, maxTokens, temperature);
      if (result) {
        console.log('✅ GROQ fallback response generated');
        return result;
      }
    } catch (error) {
      console.error('❌ All AI services failed:', error.message);
    }
  }

  console.log('⚠️ All AI services unavailable');
      return null;
}

/**
 * Generate auto caption for reel/story based on media description or context
 * @param {string} mediaUrl - URL of the media (image/video)
 * @param {string} mediaType - 'image' or 'video'
 * @param {string} context - Optional context about the content
 * @returns {Promise<string>} - Generated caption
 */
async function generateAutoCaption(mediaUrl, mediaType, context = '') {
  const prompt = `Generate an engaging, creative ${mediaType === 'video' ? 'video' : 'image'} caption for social media (Instagram Reels/TikTok style). 
${context ? `Context: ${context}` : 'Make it catchy and fun.'}

Requirements:
- Keep it under 100 characters for impact
- Use emojis appropriately
- Make it engaging and shareable
- Don't use generic phrases like "Check this out" or "Amazing view"

Caption:`;

  try {
    return await generateWithFallback(prompt, 100, 0.8);
  } catch (error) {
    console.error('Auto caption generation error:', error);
    throw new Error('Failed to generate caption: ' + error.message);
  }
}

/**
 * Generate hashtag suggestions based on caption and content
 * @param {string} caption - The reel/story caption
 * @param {string} mediaType - 'image' or 'video'
 * @returns {Promise<string[]>} - Array of suggested hashtags
 */
async function generateHashtags(caption, mediaType) {
  const prompt = `Generate 8-12 trending, relevant hashtags for this social media post:

Caption: "${caption}"
Media Type: ${mediaType}

Requirements:
- Mix of popular and niche hashtags
- Include category-specific tags
- Add trending tags like #reels #viral if video
- Don't include the caption hashtags
- Return only the hashtag list, one per line
- No explanations, just hashtags

Hashtags:`;

  try {
    const response = await generateWithFallback(prompt, 150, 0.7);

    // Parse hashtags from response
    const hashtags = response
      .split(/\n|,| /)
      .map(tag => tag.trim())
      .filter(tag => tag.startsWith('#'))
      .map(tag => tag.replace(/^#/, ''))
      .filter(tag => tag.length > 0)
      .slice(0, 12);

    return hashtags.length > 0 ? hashtags : ['reels', 'viral', 'trending', 'content', 'instagood', 'photooftheday', 'love', 'instagram'];
  } catch (error) {
    console.error('Hashtag generation error:', error);
    throw new Error('Failed to generate hashtags: ' + error.message);
  }
}

/**
 * Translate caption to multiple languages
 * @param {string} caption - The caption to translate
 * @param {string[]} targetLanguages - Array of language codes (e.g., ['es', 'fr', 'hi'])
 * @returns {Promise<Object>} - Object with language codes as keys and translations as values
 */
async function translateCaption(caption, targetLanguages = ['es', 'fr', 'hi', 'ar', 'zh']) {
  const translations = {};
  const languageNames = {
    es: 'Spanish',
    fr: 'French',
    hi: 'Hindi',
    ar: 'Arabic',
    zh: 'Chinese',
    de: 'German',
    ja: 'Japanese',
    ko: 'Korean',
    ru: 'Russian',
    pt: 'Portuguese',
    it: 'Italian',
    en: 'English'
  };

  for (const lang of targetLanguages) {
    const prompt = `Translate this social media caption to ${languageNames[lang] || lang}. Keep the tone casual and social-media appropriate:

Original: "${caption}"

Translation:`;

    try {
      const translation = await generateWithFallback(prompt, 200, 0.3);
      if (translation) {
        translations[lang] = translation;
      }
    } catch (error) {
      console.error(`Translation error for ${lang}:`, error.message);
    }
  }

  return translations;
}

/**
 * Generate a summary of the content
 * @param {string} caption - The caption
 * @param {string} mediaType - 'image' or 'video'
 * @returns {Promise<string>} - Generated summary
 */
async function generateSummary(caption, mediaType) {
  const prompt = `Create a brief, engaging summary of this ${mediaType} content in 1-2 sentences:

Caption: "${caption}"

Summary:`;

  try {
    return await generateWithFallback(prompt, 100, 0.5);
  } catch (error) {
    console.error('Summary generation error:', error);
    throw new Error('Failed to generate summary: ' + error.message);
  }
}

/**
 * Generate AI caption for story
 * @param {string} context - Optional context about the content
 * @returns {Promise<string>} - Generated caption
 */
async function generateStoryCaption(context = '') {
  const prompt = `Generate an engaging story caption for social media (Instagram/Snapchat style).
${context ? `Context: ${context}` : 'Make it creative and engaging.'}

Requirements:
- Keep it short (under 80 characters)
- Use emojis appropriately
- Be personal and authentic
- Great for a social media story

Caption:`;

  try {
    return await generateWithFallback(prompt, 100, 0.8);
  } catch (error) {
    console.error('Story caption generation error:', error);
    throw new Error('Failed to generate story caption: ' + error.message);
  }
}

/**
 * Generate hashtags for story
 * @param {string} caption - The story caption
 * @returns {Promise<string[]>} - Array of suggested hashtags
 */
async function generateStoryHashtags(caption) {
  const prompt = `Generate 5-8 trending hashtags for this story:

Caption: "${caption}"

Requirements:
- Mix of popular and niche hashtags
- Perfect for Instagram stories
- Return only the hashtag list, one per line
- No explanations

Hashtags:`;

  try {
    const response = await generateWithFallback(prompt, 150, 0.7);

    const hashtags = response
      .split(/\n|,| /)
      .map(tag => tag.trim())
      .filter(tag => tag.startsWith('#'))
      .map(tag => tag.replace(/^#/, ''))
      .filter(tag => tag.length > 0)
      .slice(0, 8);

    return hashtags.length > 0 ? hashtags : ['story', 'instastory', 'daily', 'moments', 'lifestyle'];
  } catch (error) {
    console.error('Story hashtag generation error:', error);
    throw new Error('Failed to generate story hashtags: ' + error.message);
  }
}

/**
 * Translate story content
 * @param {string} text - The text to translate
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<string>} - Translated text
 */
async function translateStory(text, targetLanguage) {
  const languageNames = {
    es: 'Spanish',
    fr: 'French',
    hi: 'Hindi',
    ar: 'Arabic',
    zh: 'Chinese',
    de: 'German',
    ja: 'Japanese',
    ko: 'Korean',
    ru: 'Russian',
    pt: 'Portuguese',
    it: 'Italian',
    en: 'English'
  };

  const prompt = `Translate this social media story text to ${languageNames[targetLanguage] || targetLanguage}. Keep it casual and natural:

Original: "${text}"

Translation:`;

  try {
    return await generateWithFallback(prompt, 200, 0.3);
  } catch (error) {
    console.error('Story translation error:', error);
    throw new Error('Failed to translate story: ' + error.message);
  }
}

/**
 * Generate story summary
 * @param {string} caption - The story caption
 * @returns {Promise<string>} - Generated summary
 */
async function generateStorySummary(caption) {
  const prompt = `Create a brief, engaging summary of this story in 1-2 sentences:

Caption: "${caption}"

Summary:`;

  try {
    return await generateWithFallback(prompt, 100, 0.5);
  } catch (error) {
    console.error('Story summary generation error:', error);
    throw new Error('Failed to generate story summary: ' + error.message);
  }
}

/**
 * Analyze sentiment of caption/content
 * @param {string} caption - The caption to analyze
 * @returns {Promise<'positive' | 'neutral' | 'negative'>} - Sentiment result
 */
async function analyzeSentiment(caption) {
  const prompt = `Analyze the sentiment of this caption. Reply with ONLY ONE word: positive, neutral, or negative.

Caption: "${caption}"`;

  try {
    const response = await generateWithFallback(prompt, 10, 0);
    const lower = response.toLowerCase();
    if (lower.includes('positive')) return 'positive';
    if (lower.includes('negative')) return 'negative';
    return 'neutral';
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return 'neutral';
  }
}

/**
 * Process all AI features for a reel
 * @param {Object} reelData - Reel data object
 * @returns {Promise<Object>} - AI-generated content for the reel
 */
async function processAllAIFeatures(reelData) {
  const { caption, mediaUrl, mediaType } = reelData;

  try {
    const results = {
      autoCaption: null,
      hashtags: [],
      summary: null,
      translations: {},
      detectedObjects: [],
      sentiment: 'neutral'
    };

    // Run independent operations in parallel
    const [hashtagResult, summaryResult, sentimentResult] = await Promise.allSettled([
      generateHashtags(caption || 'Reel content', mediaType),
      generateSummary(caption || 'Reel content', mediaType),
      analyzeSentiment(caption || '')
    ]);

    if (hashtagResult.status === 'fulfilled') results.hashtags = hashtagResult.value;
    if (summaryResult.status === 'fulfilled') results.summary = summaryResult.value;
    if (sentimentResult.status === 'fulfilled') results.sentiment = sentimentResult.value;

    // Generate auto caption only if no caption provided
    if (!caption || caption.trim().length === 0) {
      try {
        const autoCaptionResult = await generateAutoCaption(mediaUrl, mediaType);
        results.autoCaption = autoCaptionResult;
      } catch (e) {
        console.error('Auto caption generation failed:', e.message);
      }
    }

    return results;
  } catch (error) {
    console.error('AI features processing error:', error);
    throw new Error('Failed to process AI features');
  }
}

/**
 * Check if AI service is available
 * @returns {boolean}
 */
function isAIServiceAvailable() {
  return !!(GROQ_API_KEY || openai);
}

export {
  generateAutoCaption,
  generateHashtags,
  translateCaption,
  generateSummary,
  generateStoryCaption,
  generateStoryHashtags,
  translateStory,
  generateStorySummary,
  analyzeSentiment,
  isAIServiceAvailable,
  generateWithFallback,
  processAllAIFeatures,
};

export default {
  generateAutoCaption,
  generateHashtags,
  translateCaption,
  generateSummary,
  generateStoryCaption,
  generateStoryHashtags,
  translateStory,
  generateStorySummary,
  analyzeSentiment,
  isAIServiceAvailable,
  generateWithFallback,
  processAllAIFeatures,
};
