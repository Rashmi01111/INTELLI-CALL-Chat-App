import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";

// Initialize AI clients
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

/**
 * Generate auto caption for reel based on media description or context
 * @param {string} mediaUrl - URL of the media (image/video)
 * @param {string} mediaType - 'image' or 'video'
 * @param {string} context - Optional context about the content
 * @returns {Promise<string>} - Generated caption
 */
async function generateAutoCaption(mediaUrl, mediaType, context = '') {
  const prompt = `Generate an engaging, creative ${mediaType === 'video' ? 'video' : 'image'} caption for social media (Instagram Reels style). 
${context ? `Context: ${context}` : 'Make it catchy and fun.'}

Requirements:
- Keep it under 100 characters for impact
- Use emojis appropriately
- Make it engaging and shareable
- Don't use generic phrases like "Check this out" or "Amazing view"

Caption:`;

  try {
    // Try Gemini first
    if (genAI) {
      const model = genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const response = await model;
      return response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }

    // Fallback to OpenAI
    if (openai) {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a creative social media caption writer.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.8
      });
      return response.choices[0]?.message?.content?.trim() || '';
    }

    throw new Error('No AI service configured');
  } catch (error) {
    console.error('Auto caption generation error:', error);
    throw new Error('Failed to generate caption');
  }
}

/**
 * Generate hashtag suggestions based on caption and content
 * @param {string} caption - The reel caption
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
    let response;
    
    if (genAI) {
      const result = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      response = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } else if (openai) {
      const result = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a social media hashtag expert.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      });
      response = result.choices[0]?.message?.content?.trim() || '';
    } else {
      throw new Error('No AI service configured');
    }

    // Parse hashtags from response
    const hashtags = response
      .split(/\n|,| /)
      .map(tag => tag.trim())
      .filter(tag => tag.startsWith('#'))
      .map(tag => tag.replace(/^#/, ''))
      .filter(tag => tag.length > 0)
      .slice(0, 12);

    return hashtags.length > 0 ? hashtags : ['reels', 'viral', 'trending', 'content'];
  } catch (error) {
    console.error('Hashtag generation error:', error);
    throw new Error('Failed to generate hashtags');
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
    pt: 'Portuguese'
  };

  for (const lang of targetLanguages) {
    const prompt = `Translate this social media caption to ${languageNames[lang] || lang}. Keep the tone casual and social-media appropriate:

Original: "${caption}"

Translation:`;

    try {
      let translation = '';
      
      if (genAI) {
        const result = await genAI.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        translation = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      } else if (openai) {
        const result = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: 'You are a professional translator.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 200,
          temperature: 0.3
        });
        translation = result.choices[0]?.message?.content?.trim() || '';
      }

      if (translation) {
        translations[lang] = translation;
      }
    } catch (error) {
      console.error(`Translation error for ${lang}:`, error);
    }
  }

  return translations;
}

/**
 * Generate a summary of the reel content
 * @param {string} caption - The reel caption
 * @param {string} mediaType - 'image' or 'video'
 * @returns {Promise<string>} - Generated summary
 */
async function generateReelSummary(caption, mediaType) {
  const prompt = `Create a brief, engaging summary of this ${mediaType} content in 1-2 sentences:

Caption: "${caption}"

Summary:`;

  try {
    if (genAI) {
      const result = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      return result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }

    if (openai) {
      const result = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You create concise content summaries.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.5
      });
      return result.choices[0]?.message?.content?.trim() || '';
    }

    throw new Error('No AI service configured');
  } catch (error) {
    console.error('Summary generation error:', error);
    throw new Error('Failed to generate summary');
  }
}

/**
 * Detect objects/content in media for better tagging (simulated - would use vision API in production)
 * @param {string} mediaUrl - URL of the media
 * @param {string} mediaType - 'image' or 'video'
 * @returns {Promise<string[]>} - Detected objects/tags
 */
async function detectObjects(mediaUrl, mediaType) {
  // In production, this would use Google Vision API or similar
  // For now, we'll use AI to suggest likely content based on context
  const prompt = `Based on this ${mediaType} URL, suggest 5-8 likely objects, scenes, or subjects that might be in this content:

Media URL: ${mediaUrl}

Return a comma-separated list of objects/subjects only.`;

  try {
    let response = '';
    
    if (genAI) {
      const result = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      response = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } else if (openai) {
      const result = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.6
      });
      response = result.choices[0]?.message?.content?.trim() || '';
    }

    return response
      .split(/,|\n/)
      .map(item => item.trim().toLowerCase())
      .filter(item => item.length > 0)
      .slice(0, 8);
  } catch (error) {
    console.error('Object detection error:', error);
    return [];
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
    let response = '';
    
    if (genAI) {
      const result = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      response = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toLowerCase() || '';
    } else if (openai) {
      const result = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0
      });
      response = result.choices[0]?.message?.content?.trim()?.toLowerCase() || '';
    }

    if (response.includes('positive')) return 'positive';
    if (response.includes('negative')) return 'negative';
    return 'neutral';
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return 'neutral';
  }
}

/**
 * Generate video thumbnail from video URL
 * @param {string} videoUrl - URL of the video
 * @returns {Promise<string>} - URL of generated thumbnail
 */
async function generateThumbnail(videoUrl) {
  // In a production environment, this would:
  // 1. Download the video
  // 2. Extract a frame at 1-2 seconds
  // 3. Apply AI enhancements
  // 4. Upload to cloud storage
  // 5. Return the thumbnail URL
  
  // For this implementation, we'll return the first frame URL as a placeholder
  // The client can extract frames from the video
  return null; // Client-side will handle thumbnail extraction
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
    const [hashtagResult, summaryResult, objectsResult, sentimentResult] = await Promise.allSettled([
      generateHashtags(caption || 'Reel content', mediaType),
      generateReelSummary(caption || 'Reel content', mediaType),
      detectObjects(mediaUrl, mediaType),
      analyzeSentiment(caption || '')
    ]);

    if (hashtagResult.status === 'fulfilled') results.hashtags = hashtagResult.value;
    if (summaryResult.status === 'fulfilled') results.summary = summaryResult.value;
    if (objectsResult.status === 'fulfilled') results.detectedObjects = objectsResult.value;
    if (sentimentResult.status === 'fulfilled') results.sentiment = sentimentResult.value;

    // Generate auto caption only if no caption provided
    if (!caption || caption.trim().length === 0) {
      const autoCaptionResult = await generateAutoCaption(mediaUrl, mediaType);
      results.autoCaption = autoCaptionResult;
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
  return !!(genAI || openai);
}

export {
  generateAutoCaption,
  generateHashtags,
  translateCaption,
  generateReelSummary,
  detectObjects,
  analyzeSentiment,
  generateThumbnail,
  processAllAIFeatures,
  isAIServiceAvailable
};

export default {
  generateAutoCaption,
  generateHashtags,
  translateCaption,
  generateReelSummary,
  detectObjects,
  analyzeSentiment,
  generateThumbnail,
  processAllAIFeatures,
  isAIServiceAvailable
};
