import mongoose from 'mongoose';

/**
 * Enhanced Message Schema with WhatsApp-like Read Receipts
 * Optimized for production with proper indexing
 */
const messageSchema = new mongoose.Schema({
  // Unique message identifier (client-generated for deduplication)
  id: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // Reference to Chat document (for efficient querying)
  chatId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chat',
    index: true 
  },
  
  // Legacy support: direct user references
  user: { type: String, required: true }, // Sender name
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  },
  to: { type: String }, // Recipient name (for private messages)
  groupId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Group',
    index: true 
  },
  
  // Message content
  text: { type: String },
  // Translation support
  originalText: { type: String },
  translatedText: { type: String },
  translateTargetLang: { type: String },
  image: { type: String },
  video: { type: String },
  audio: { type: String },
  
  // Timestamps
  timestamp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  
  // Message metadata
  profilePic: { type: String },
  isGhost: { type: Boolean, default: false },
  isAI: { type: Boolean, default: false },
  isBlind: { type: Boolean, default: false },
  isSystem: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
  editedAt: { type: String },
  isDeleted: { type: Boolean, default: false },
  deletedFor: [{ type: String }],
  
  // Sentiment analysis
  sentiment: { type: String },
  
  // Reactions: { emoji: [userId1, userId2, ...] }
  reactions: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  
  // ==========================================
  // READ RECEIPTS (WhatsApp-style)
  // ==========================================
  
  // Delivery status: 'sent' | 'delivered' | 'read'
  deliveryStatus: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'], 
    default: 'sent',
    index: true 
  },
  
  // When message was delivered to recipients
  deliveredAt: { type: Date },
  
  // When message was fully read by all participants
  readAt: { type: Date },
  
  // Read receipts: array of user IDs who have read the message
  readBy: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  
  // Delivered receipts: array of user IDs who have received the message
  deliveredTo: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now }
  }],
  
  // ==========================================
  // FORWARDING & REPLIES
  // ==========================================
  
  // Forwarded message tracking
  isForwarded: { type: Boolean, default: false },
  forwardedFrom: { type: String }, // Original sender name
  originalMessageId: { type: String }, // Original message ID
  
  // Reply to message
  replyTo: {
    messageId: { type: String },
    senderName: { type: String },
    text: { type: String }
  },
  
  // ==========================================
  // REELS INTEGRATION
  // ==========================================
  
  reelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel' },
  reelData: { type: mongoose.Schema.Types.Mixed },
  
}, { 
  timestamps: true,
  collection: 'messages'
});

// ==========================================
// INDEXES FOR OPTIMIZATION
// ==========================================

// Primary query patterns
messageSchema.index({ chatId: 1, createdAt: -1 }); // Get messages for a chat (newest first)
messageSchema.index({ senderId: 1, createdAt: -1 }); // Get messages by sender
messageSchema.index({ groupId: 1, createdAt: -1 }); // Get group messages

// Read receipt queries
messageSchema.index({ chatId: 1, 'readBy.userId': 1 }); // Find unread messages for user
messageSchema.index({ senderId: 1, deliveryStatus: 1 }); // Find pending delivery receipts

// Compound indexes for common operations
messageSchema.index({ chatId: 1, deliveryStatus: 1, createdAt: -1 }); // Get undelivered messages
messageSchema.index({ id: 1, senderId: 1 }); // Find message by ID and verify sender

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Mark message as delivered to a specific user
 * Uses $addToSet to prevent duplicates
 */
messageSchema.methods.markDelivered = async function(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  // Check if already delivered to this user
  const alreadyDelivered = this.deliveredTo.some(
    d => d.userId.toString() === userId.toString()
  );
  
  if (!alreadyDelivered) {
    this.deliveredTo.push({ 
      userId: userObjectId, 
      deliveredAt: new Date() 
    });
    
    // Update delivery status if at least one recipient received it
    if (this.deliveryStatus === 'sent') {
      this.deliveryStatus = 'delivered';
      this.deliveredAt = new Date();
    }
    
    await this.save();
  }
  
  return this;
};

/**
 * Mark message as read by a specific user
 * Uses $addToSet pattern with bulk update support
 */
messageSchema.methods.markRead = async function(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  // Check if already read by this user
  const alreadyRead = this.readBy.some(
    r => r.userId.toString() === userId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({ 
      userId: userObjectId, 
      readAt: new Date() 
    });
    
    // Check if all participants have read
    // This would need chat info passed in or populated
    this.deliveryStatus = 'read';
    this.readAt = new Date();
    
    await this.save();
  }
  
  return this;
};

/**
 * Get read receipt status for display
 * Returns: 'sent' | 'delivered' | 'read'
 */
messageSchema.methods.getReadStatus = function() {
  if (this.readBy.length > 0) {
    return 'read';
  } else if (this.deliveredTo.length > 0) {
    return 'delivered';
  }
  return 'sent';
};

/**
 * Check if message is read by all participants
 */
messageSchema.methods.isReadByAll = function(participantCount) {
  // Exclude sender from participant count
  const expectedReaders = participantCount - 1;
  return this.readBy.length >= expectedReaders && expectedReaders > 0;
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Bulk mark messages as read by a user in a chat
 * Efficient batch update using updateMany with $addToSet
 */
messageSchema.statics.markMultipleAsRead = async function(chatId, userId, messageIds) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  
  const result = await this.updateMany(
    { 
      id: { $in: messageIds },
      'readBy.userId': { $ne: userObjectId } // Only update if not already read
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
  
  return result;
};

/**
 * Get unread message count for a user in a chat
 */
messageSchema.statics.getUnreadCount = async function(chatId, userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  return await this.countDocuments({
    chatId: chatId,
    senderId: { $ne: userObjectId },
    'readBy.userId': { $ne: userObjectId }
  });
};

/**
 * Get messages with read receipts for a chat
 * Efficient aggregation with read status
 */
messageSchema.statics.getMessagesWithReadStatus = async function(chatId, userId, limit = 50) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  const messages = await this.find({ chatId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'name pic')
    .populate('readBy.userId', 'name pic')
    .lean();
  
  // Add computed fields
  return messages.map(msg => ({
    ...msg,
    isReadByMe: msg.readBy.some(r => r.userId._id.toString() === userId.toString()),
    readByCount: msg.readBy.length
  })).reverse();
};

const MessageV2 = mongoose.model('MessageV2', messageSchema);

export default MessageV2;
