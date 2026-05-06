import mongoose from 'mongoose';

/**
 * Chat Controller - Handles chat-related API endpoints
 * Includes: read receipts, chat management, message status
 */

class ChatController {
  constructor(models) {
    this.Message = models.Message;
    this.Chat = models.Chat;
    this.User = models.User;
    this.Group = models.Group;
  }

  /**
   * POST /api/chat/:chatId/mark-read
   * Mark messages as read with bulk update using $addToSet
   */
  markMessagesAsRead = async (req, res) => {
    try {
      const { chatId } = req.params;
      const { userId, messageIds } = req.body;

      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'userId is required' 
        });
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const now = new Date();

      let result;

      // If specific message IDs provided, mark only those
      if (messageIds && messageIds.length > 0) {
        result = await this.Message.updateMany(
          {
            id: { $in: messageIds },
            senderId: { $ne: userObjectId },
            'readBy.userId': { $ne: userObjectId }
          },
          {
            $addToSet: {
              readBy: { userId: userObjectId, readAt: now }
            },
            $set: {
              deliveryStatus: 'read',
              readAt: now
            }
          }
        );
      } else {
        // Mark all unread messages in chat as read
        result = await this.Message.updateMany(
          {
            $or: [
              { chatId: new mongoose.Types.ObjectId(chatId) },
              { groupId: new mongoose.Types.ObjectId(chatId) }
            ],
            senderId: { $ne: userObjectId },
            'readBy.userId': { $ne: userObjectId }
          },
          {
            $addToSet: {
              readBy: { userId: userObjectId, readAt: now }
            },
            $set: {
              deliveryStatus: 'read',
              readAt: now
            }
          }
        );
      }

      // Update chat unread count
      if (this.Chat) {
        await this.Chat.findByIdAndUpdate(
          chatId,
          { 
            $set: { 
              'unreadCounts.$[elem].count': 0 
            }
          },
          {
            arrayFilters: [{ 'elem.userId': userObjectId }]
          }
        );
      }

      res.json({
        success: true,
        message: 'Messages marked as read',
        modifiedCount: result.modifiedCount,
        chatId,
        userId
      });

    } catch (error) {
      console.error('Mark messages read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark messages as read',
        error: error.message
      });
    }
  };

  /**
   * GET /api/chat/:chatId/messages
   * Get messages with read receipts for a chat
   */
  getMessagesWithReadStatus = async (req, res) => {
    try {
      const { chatId } = req.params;
      const { userId, limit = 50, before } = req.query;

      const query = {
        $or: [
          { chatId: new mongoose.Types.ObjectId(chatId) },
          { groupId: new mongoose.Types.ObjectId(chatId) }
        ]
      };

      if (before) {
        query.createdAt = { $lt: new Date(before) };
      }

      const messages = await this.Message.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('senderId', 'name pic')
        .populate('readBy.userId', 'name pic')
        .lean();

      // Add computed read status for each message
      const messagesWithStatus = messages.reverse().map(msg => ({
        ...msg,
        isReadByMe: msg.readBy.some(
          r => r.userId._id.toString() === userId
        ),
        readByCount: msg.readBy.length,
        readStatus: this.getReadStatusDisplay(msg)
      }));

      res.json({
        success: true,
        messages: messagesWithStatus,
        chatId
      });

    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch messages',
        error: error.message
      });
    }
  };

  /**
   * GET /api/chat/:chatId/read-receipts
   * Get detailed read receipts for messages in a chat
   */
  getReadReceipts = async (req, res) => {
    try {
      const { chatId } = req.params;
      const { messageIds } = req.query;

      const query = {
        $or: [
          { chatId: new mongoose.Types.ObjectId(chatId) },
          { groupId: new mongoose.Types.ObjectId(chatId) }
        ]
      };

      if (messageIds) {
        query.id = { $in: messageIds.split(',') };
      }

      const messages = await this.Message.find(query)
        .select('id readBy deliveredTo senderId')
        .populate('readBy.userId', 'name pic')
        .populate('deliveredTo.userId', 'name pic')
        .populate('senderId', 'name pic');

      const readReceipts = messages.map(msg => ({
        messageId: msg.id,
        senderId: msg.senderId,
        readBy: msg.readBy.map(r => ({
          userId: r.userId._id,
          name: r.userId.name,
          pic: r.userId.pic,
          readAt: r.readAt
        })),
        deliveredTo: msg.deliveredTo.map(d => ({
          userId: d.userId._id,
          name: d.userId.name,
          deliveredAt: d.deliveredAt
        }))
      }));

      res.json({
        success: true,
        readReceipts
      });

    } catch (error) {
      console.error('Get read receipts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch read receipts',
        error: error.message
      });
    }
  };

  /**
   * POST /api/chat/:chatId/mark-delivered
   * Mark messages as delivered to current user
   */
  markMessagesAsDelivered = async (req, res) => {
    try {
      const { chatId } = req.params;
      const { userId } = req.body;
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const now = new Date();

      const result = await this.Message.updateMany(
        {
          $or: [
            { chatId: new mongoose.Types.ObjectId(chatId) },
            { groupId: new mongoose.Types.ObjectId(chatId) }
          ],
          senderId: { $ne: userObjectId },
          'deliveredTo.userId': { $ne: userObjectId },
          deliveryStatus: 'sent'
        },
        {
          $addToSet: {
            deliveredTo: { userId: userObjectId, deliveredAt: now }
          },
          $set: {
            deliveryStatus: 'delivered',
            deliveredAt: now
          }
        }
      );

      res.json({
        success: true,
        message: 'Messages marked as delivered',
        modifiedCount: result.modifiedCount
      });

    } catch (error) {
      console.error('Mark delivered error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark messages as delivered'
      });
    }
  };

  /**
   * GET /api/user/:userId/unread-counts
   * Get unread message counts for all chats for a user
   */
  getUnreadCounts = async (req, res) => {
    try {
      const { userId } = req.params;
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Aggregate unread counts by chat
      const unreadCounts = await this.Message.aggregate([
        {
          $match: {
            senderId: { $ne: userObjectId },
            'readBy.userId': { $ne: userObjectId },
            isDeleted: { $ne: true }
          }
        },
        {
          $group: {
            _id: {
              $ifNull: ['$chatId', '$groupId']
            },
            count: { $sum: 1 },
            lastMessageAt: { $max: '$createdAt' }
          }
        },
        {
          $match: {
            _id: { $ne: null }
          }
        }
      ]);

      // Format response
      const counts = unreadCounts.reduce((acc, item) => {
        acc[item._id.toString()] = {
          count: item.count,
          lastMessageAt: item.lastMessageAt
        };
        return acc;
      }, {});

      res.json({
        success: true,
        unreadCounts: counts
      });

    } catch (error) {
      console.error('Get unread counts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch unread counts'
      });
    }
  };

  /**
   * GET /api/user/:userId/online-status
   * Get online status and last seen for a user
   */
  getUserOnlineStatus = async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await this.User.findById(userId)
        .select('isOnline lastSeen name pic');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        userId,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        name: user.name,
        pic: user.pic,
        formattedLastSeen: this.formatLastSeen(user.lastSeen)
      });

    } catch (error) {
      console.error('Get online status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch online status'
      });
    }
  };

  /**
   * POST /api/user/:userId/typing-status
   * Update typing status (fallback for socket issues)
   */
  updateTypingStatus = async (req, res) => {
    try {
      const { userId } = req.params;
      const { chatId, isTyping } = req.body;

      // This is mainly for REST API fallback
      // Typing is typically handled via sockets
      
      res.json({
        success: true,
        message: `Typing status ${isTyping ? 'started' : 'stopped'}`,
        userId,
        chatId,
        isTyping
      });

    } catch (error) {
      console.error('Typing status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update typing status'
      });
    }
  };

  /**
   * Helper: Format last seen timestamp for display
   */
  formatLastSeen(lastSeen) {
    if (!lastSeen) return 'Unknown';
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return lastSeenDate.toLocaleDateString();
  }

  /**
   * Helper: Get read status display text
   */
  getReadStatusDisplay(message) {
    if (message.readBy.length > 0) {
      return 'read';
    } else if (message.deliveredTo.length > 0) {
      return 'delivered';
    }
    return 'sent';
  }
}

export default ChatController;
