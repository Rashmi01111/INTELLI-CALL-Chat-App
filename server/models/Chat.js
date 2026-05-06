import mongoose from 'mongoose';

/**
 * Chat Schema - Represents a conversation (1-on-1 or Group)
 * Optimized for large-scale chat applications
 */
const chatSchema = new mongoose.Schema({
  // Chat type: 'private' for 1-on-1, 'group' for group chats
  type: { 
    type: String, 
    enum: ['private', 'group'], 
    required: true,
    index: true 
  },
  
  // For private chats: array of 2 user IDs (sorted for consistency)
  // For group chats: array of all member user IDs
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  }],
  
  // Group-specific fields
  name: { 
    type: String,
    required: function() { return this.type === 'group'; }
  },
  description: { type: String },
  pic: { 
    type: String, 
    default: "https://icon-library.com/images/group-icon/group-icon-10.jpg" 
  },
  admin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // For private chats: store the other user's info for quick access
  // This is denormalized data for performance
  privateChatPartner: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    pic: String
  },
  
  // Last message info for chat list display (denormalized for performance)
  lastMessage: {
    messageId: String,
    text: String,
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: String,
    timestamp: Date,
    messageType: { type: String, enum: ['text', 'image', 'video', 'audio', 'system'] }
  },
  
  // Unread counts per user (for efficient unread badge updates)
  unreadCounts: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 }
  }],
  
  // Chat settings
  isActive: { type: Boolean, default: true },
  isArchived: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  mutedBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  // Optimize for read-heavy workloads
  collection: 'chats'
});

// Compound indexes for efficient queries
chatSchema.index({ participants: 1, updatedAt: -1 }); // Get user's chats sorted by activity
chatSchema.index({ type: 1, participants: 1 }); // Find private chat between specific users
chatSchema.index({ 'unreadCounts.userId': 1 }); // Get all unread counts for a user

// Static method to find or create private chat between two users
chatSchema.statics.findOrCreatePrivateChat = async function(userId1, userId2) {
  const sortedIds = [userId1, userId2].sort().map(id => 
    new mongoose.Types.ObjectId(id)
  );
  
  let chat = await this.findOne({
    type: 'private',
    participants: { $all: sortedIds, $size: 2 }
  });
  
  if (!chat) {
    const User = mongoose.model('User');
    const partner = await User.findById(userId2).select('name pic');
    
    chat = await this.create({
      type: 'private',
      participants: sortedIds,
      privateChatPartner: {
        userId: userId2,
        name: partner?.name || 'Unknown',
        pic: partner?.pic
      }
    });
  }
  
  return chat;
};

// Method to update last message
chatSchema.methods.updateLastMessage = async function(messageData) {
  this.lastMessage = {
    messageId: messageData.id,
    text: messageData.text?.substring(0, 100) || '', // Truncate for preview
    senderId: messageData.senderId,
    senderName: messageData.user,
    timestamp: new Date(messageData.timestamp),
    messageType: messageData.image ? 'image' : 
                  messageData.video ? 'video' : 
                  messageData.audio ? 'audio' : 'text'
  };
  
  // Update unread counts for all participants except sender
  this.participants.forEach(participantId => {
    if (participantId.toString() !== messageData.senderId?.toString()) {
      const unreadEntry = this.unreadCounts.find(
        u => u.userId.toString() === participantId.toString()
      );
      if (unreadEntry) {
        unreadEntry.count += 1;
      } else {
        this.unreadCounts.push({ userId: participantId, count: 1 });
      }
    }
  });
  
  this.updatedAt = new Date();
  await this.save();
};

// Method to mark chat as read for a user
chatSchema.methods.markAsRead = async function(userId) {
  const unreadEntry = this.unreadCounts.find(
    u => u.userId.toString() === userId.toString()
  );
  if (unreadEntry) {
    unreadEntry.count = 0;
    await this.save();
  }
};

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
