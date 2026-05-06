import express from 'express';
import { translateText, batchTranslateText } from '../services/translatorService.js';

const router = express.Router();

/**
 * @route   POST /api/ai/translate
 * @desc    Translate text to target language using OpenAI
 * @access  Public
 * @body    {string} text - Text to translate
 * @body    {string} targetLanguage - Target language code (e.g., 'hi', 'es', 'en')
 * @body    {string} sourceLanguage - Source language code or 'auto' for auto-detection
 * @returns {object} { text: string, targetLanguage: string, sourceLanguage: string }
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'auto' } = req.body;

    // Validate input
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Target language is required'
      });
    }

    // Handle empty text
    if (!text.trim()) {
      return res.json({
        success: true,
        text: text,
        targetLanguage,
        sourceLanguage
      });
    }

    console.log(`🌐 Translation request: ${sourceLanguage} → ${targetLanguage}`);
    console.log(`   Text length: ${text.length} chars`);

    const translatedText = await translateText(text, targetLanguage, sourceLanguage);

    res.json({
      success: true,
      text: translatedText,
      targetLanguage,
      sourceLanguage,
      originalLength: text.length,
      translatedLength: translatedText.length
    });

  } catch (error) {
    console.error('❌ Translation endpoint error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Translation failed',
      originalText: req.body.text
    });
  }
});

/**
 * @route   POST /api/ai/translate-batch
 * @desc    Translate multiple texts to target language (more efficient)
 * @access  Public
 * @body    {array} texts - Array of texts to translate
 * @body    {string} targetLanguage - Target language code
 * @body    {string} sourceLanguage - Source language code or 'auto'
 * @returns {object} { texts: array, targetLanguage: string }
 */
router.post('/translate-batch', async (req, res) => {
  try {
    const { texts, targetLanguage, sourceLanguage = 'auto' } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Texts array is required and must not be empty'
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Target language is required'
      });
    }

    console.log(`🌐 Batch translation request: ${texts.length} texts`);
    console.log(`   ${sourceLanguage} → ${targetLanguage}`);

    const translatedTexts = await batchTranslateText(texts, targetLanguage, sourceLanguage);

    res.json({
      success: true,
      texts: translatedTexts,
      count: translatedTexts.length,
      targetLanguage,
      sourceLanguage
    });

  } catch (error) {
    console.error('❌ Batch translation endpoint error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Batch translation failed'
    });
  }
});

/**
 * @route   GET /api/ai/translate/health
 * @desc    Check if translation service is available
 * @access  Public
 * @returns {object} { status: string, openaiConfigured: boolean }
 */
router.get('/translate/health', (req, res) => {
  const openaiConfigured = !!process.env.OPENAI_API_KEY;
  const geminiConfigured = !!process.env.GEMINI_API_KEY;
  
  res.json({
    status: (geminiConfigured || openaiConfigured) ? 'healthy' : 'not-configured',
    geminiConfigured,
    openaiConfigured,
    primaryService: geminiConfigured ? 'Gemini' : (openaiConfigured ? 'OpenAI' : 'none'),
    message: (geminiConfigured || openaiConfigured) 
      ? `Translation service ready (Primary: ${geminiConfigured ? 'Gemini' : 'OpenAI'})`
      : 'No translation API keys configured - set GEMINI_API_KEY or OPENAI_API_KEY in .env'
  });
});

export default router;
