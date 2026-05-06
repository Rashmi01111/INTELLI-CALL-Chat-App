import mongoose from 'mongoose';
import SummaryCache from '../models/SummaryCache.js';
import openaiService from '../services/openaiService.js';

// Use the Message model from mongoose.models (registered in server.ts)
const Message = mongoose.models.Message;

const MIN_MESSAGES_FOR_SUMMARY = 5;

/**
 * Get unread message summary for a chat
 * GET /chat/:chatId/unread-summary
 */
async function getUnreadSummary(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user._id; // From auth middleware
    const currentUserName = req.user.name;

    // Validate chatId
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }

    // Check OpenAI configuration
    if (!openaiService.isConfigured()) {
      return res.status(503).json({ 
        error: 'AI summary service not available',
        unreadCount: 0,
        summary: null
      });
    }

    // Build query for unread messages based on chat type
    let query;
    if (chatId.startsWith('group_')) {
      // Group chat - messages where user is not in readBy array
      const groupId = chatId.replace('group_', '');
      query = {
        groupId: new mongoose.Types.ObjectId(groupId),
        'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) }
      };
    } else {
      // Private chat - messages between current user and other user
      query = {
        $or: [
          { user: currentUserName, to: chatId },
          { user: chatId, to: currentUserName }
        ],
        'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) }
      };
    }

    // Fetch unread messages
    const unreadMessages = await Message.find(query)
    .sort({ createdAt: 1 }) // Chronological order
    .limit(50) // Reasonable limit for cost control
    .populate('senderId', 'name');

    const unreadCount = unreadMessages.length;

    // If less than 5 unread messages, don't summarize
    if (unreadCount < MIN_MESSAGES_FOR_SUMMARY) {
      return res.json({
        unreadCount,
        summary: null,
        messages: unreadMessages.map(m => ({
          id: m._id,
          sender: m.senderId?.name || m.user || 'Unknown',
          message: m.text,
          createdAt: m.createdAt
        }))
      });
    }

    // Get the latest message ID
    const lastMessage = unreadMessages[unreadMessages.length - 1];
    const lastMessageId = lastMessage._id;

    // Check if we have a valid cached summary
    const cachedSummary = await SummaryCache.findOne({
      chatId,
      userId,
      lastMessageId
    });

    if (cachedSummary) {
      // Return cached summary
      return res.json({
        unreadCount: cachedSummary.unreadCount,
        summary: cachedSummary.summary,
        cached: true,
        lastMessageId
      });
    }

    // Prepare messages for OpenAI
    const messagesForAI = unreadMessages.map(m => ({
      senderName: m.senderId?.name || m.user || 'Unknown',
      message: m.text
    }));

    // Generate summary
    const summary = await openaiService.generateSummary(messagesForAI);

    if (!summary) {
      return res.status(500).json({
        error: 'Failed to generate summary',
        unreadCount,
        summary: null
      });
    }

    // Cache the summary
    await SummaryCache.findOneAndUpdate(
      { chatId, userId },
      {
        lastMessageId,
        summary,
        unreadCount,
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({
      unreadCount,
      summary,
      cached: false,
      lastMessageId
    });

  } catch (error) {
    console.error('Summary Controller Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      unreadCount: 0,
      summary: null
    });
  }
}

/**
 * Generate chat summary for custom date ranges
 * POST /chat/summary
 */
async function generateChatSummary(req, res) {
  try {
    const { chatId, summaryOption, customDate, messages } = req.body;
    const userId = req.user._id;
    const currentUserName = req.user.name;

    // Validate required fields
    if (!chatId || !summaryOption) {
      return res.status(400).json({ error: 'Chat ID and summary option are required' });
    }

    // Check OpenAI configuration
    if (!openaiService.isConfigured()) {
      return res.status(503).json({ 
        error: 'AI summary service not available',
        summary: "AI summarization is not available at this time."
      });
    }

    // If messages are provided from frontend, use them directly
    let messagesToSummarize;
    if (messages && Array.isArray(messages)) {
      messagesToSummarize = messages;
    } else {
      // Otherwise fetch from database based on criteria
      let query;
      if (chatId.startsWith('group_')) {
        const groupId = chatId.replace('group_', '');
        query = { groupId: new mongoose.Types.ObjectId(groupId) };
      } else {
        query = {
          $or: [
            { user: currentUserName, to: chatId },
            { user: chatId, to: currentUserName }
          ]
        };
      }

      // Add date filtering based on summaryOption
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (summaryOption === 'today') {
        query.createdAt = { $gte: today };
      } else if (summaryOption === 'yesterday') {
        query.createdAt = { $gte: yesterday, $lt: today };
      } else if (summaryOption === 'custom' && customDate) {
        const targetDate = new Date(customDate);
        const targetDayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const targetDayEnd = new Date(targetDayStart);
        targetDayEnd.setDate(targetDayEnd.getDate() + 1);
        query.createdAt = { $gte: targetDayStart, $lt: targetDayEnd };
      }

      const dbMessages = await Message.find(query)
        .sort({ createdAt: 1 })
        .limit(100)
        .populate('senderId', 'name');

      messagesToSummarize = dbMessages.map(m => ({
        senderName: m.senderId?.name || m.user || 'Unknown',
        message: m.text,
        createdAt: m.createdAt
      }));
    }

    // Filter out system messages and empty text
    messagesToSummarize = messagesToSummarize.filter(m => 
      m.message && m.message.trim() && !m.message.startsWith('[System]')
    );

    if (messagesToSummarize.length === 0) {
      return res.json({
        summary: "No messages found for the selected criteria.",
        messageCount: 0
      });
    }

    // Generate summary using OpenAI service
    const summary = await openaiService.generateSummary(messagesToSummarize);

    if (!summary) {
      return res.status(500).json({
        error: 'Failed to generate summary',
        summary: "Unable to generate summary at this time."
      });
    }

    res.json({
      summary,
      messageCount: messagesToSummarize.length
    });

  } catch (error) {
    console.error('Chat Summary Controller Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      summary: "An error occurred while generating the summary."
    });
  }
}

/**
 * Invalidate summary cache when new messages arrive
 * Called by socket events or message creation
 */
async function invalidateSummaryCache(chatId, userId) {
  try {
    await SummaryCache.deleteOne({ chatId, userId });
    console.log(`Cache invalidated for chat ${chatId}, user ${userId}`);
  } catch (error) {
    console.error('Cache Invalidation Error:', error);
  }
}

/**
 * Invalidate all summaries for a chat (when new message sent)
 * This is called when a new message is created
 */
async function invalidateChatSummaries(chatId) {
  try {
    await SummaryCache.deleteMany({ chatId });
    console.log(`All summaries invalidated for chat ${chatId}`);
  } catch (error) {
    console.error('Bulk Cache Invalidation Error:', error);
  }
}

export {
  getUnreadSummary,
  generateChatSummary,
  invalidateSummaryCache,
  invalidateChatSummaries,
  MIN_MESSAGES_FOR_SUMMARY
};

export default {
  getUnreadSummary,
  generateChatSummary,
  invalidateSummaryCache,
  invalidateChatSummaries,
  MIN_MESSAGES_FOR_SUMMARY
};
