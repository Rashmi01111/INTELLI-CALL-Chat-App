import { Router } from 'express';
import { getUnreadSummary, generateChatSummary } from '../controllers/summaryController.js';
import { requireGoogleAuth } from '../middleware/auth.js';

const router = Router();

/**
 * @route   GET /chat/:chatId/unread-summary
 * @desc    Get AI summary of unread messages
 * @access  Private (requires Google authentication)
 */
router.get('/chat/:chatId/unread-summary', requireGoogleAuth, getUnreadSummary);

/**
 * @route   POST /chat/summary
 * @desc    Generate AI summary for chat messages (custom date ranges)
 * @access  Private (requires Google authentication)
 */
router.post('/chat/summary', requireGoogleAuth, generateChatSummary);

export default router;
