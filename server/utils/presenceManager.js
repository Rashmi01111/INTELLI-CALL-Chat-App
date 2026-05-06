/**
 * Presence Manager - Tracks online/offline status for users
 * Manages socket-to-user mapping and broadcasts presence updates
 */

class PresenceManager {
  constructor(io) {
    this.io = io;
    
    // Maps socketId -> userId
    this.socketToUser = new Map();
    
    // Maps userId -> Set of socketIds (for multi-device support)
    this.userToSockets = new Map();
    
    // Maps userId -> { lastSeen, isOnline }
    this.userPresence = new Map();
    
    // Maps userId -> Set of chatIds they're currently viewing
    this.userActiveChats = new Map();
    
    // Maps chatId -> Set of userIds currently in that chat
    this.chatActiveUsers = new Map();
    
    console.log('👥 Presence Manager initialized');
  }

  /**
   * Register a user's socket connection
   */
  async userConnected(socketId, userId, userData = {}) {
    // Map socket to user
    this.socketToUser.set(socketId, userId);
    
    // Add socket to user's socket set
    if (!this.userToSockets.has(userId)) {
      this.userToSockets.set(userId, new Set());
    }
    this.userToSockets.get(userId).add(socketId);
    
    // Update presence
    const wasOffline = !this.userPresence.get(userId)?.isOnline;
    this.userPresence.set(userId, {
      isOnline: true,
      lastSeen: new Date(),
      ...userData
    });
    
    console.log(`👤 User connected: ${userData.name || userId} (${socketId})`);
    console.log(`   Active connections: ${this.userToSockets.get(userId).size}`);
    
    // Broadcast online status if user just came online
    if (wasOffline) {
      await this.broadcastUserStatus(userId, true);
    }
    
    return wasOffline;
  }

  /**
   * Handle user disconnection
   */
  async userDisconnected(socketId) {
    const userId = this.socketToUser.get(socketId);
    
    if (!userId) {
      console.log(`⚠️ Unknown socket disconnected: ${socketId}`);
      return null;
    }
    
    // Remove socket mapping
    this.socketToUser.delete(socketId);
    
    // Remove from user's socket set
    const userSockets = this.userToSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      
      // If no more sockets for this user, mark as offline
      if (userSockets.size === 0) {
        this.userToSockets.delete(userId);
        
        // Update presence
        const userData = this.userPresence.get(userId) || {};
        this.userPresence.set(userId, {
          ...userData,
          isOnline: false,
          lastSeen: new Date()
        });
        
        // Leave all active chats
        this.leaveAllChats(userId);
        
        // Broadcast offline status
        await this.broadcastUserStatus(userId, false);
        
        console.log(`👤 User offline: ${userId}`);
        return { userId, isOffline: true };
      }
    }
    
    console.log(`👤 User ${userId} still has ${userSockets?.size || 0} active connections`);
    return { userId, isOffline: false };
  }

  /**
   * User joins a chat room
   */
  userJoinChat(userId, chatId) {
    // Track in user's active chats
    if (!this.userActiveChats.has(userId)) {
      this.userActiveChats.set(userId, new Set());
    }
    this.userActiveChats.get(userId).add(chatId);
    
    // Track in chat's active users
    if (!this.chatActiveUsers.has(chatId)) {
      this.chatActiveUsers.set(chatId, new Set());
    }
    this.chatActiveUsers.get(chatId).add(userId);
    
    console.log(`📱 User ${userId} joined chat: ${chatId}`);
    
    // Notify other users in chat that someone is typing (if they start typing)
    return this.getActiveUsersInChat(chatId);
  }

  /**
   * User leaves a chat room
   */
  userLeaveChat(userId, chatId) {
    // Remove from user's active chats
    const userChats = this.userActiveChats.get(userId);
    if (userChats) {
      userChats.delete(chatId);
      if (userChats.size === 0) {
        this.userActiveChats.delete(userId);
      }
    }
    
    // Remove from chat's active users
    const chatUsers = this.chatActiveUsers.get(chatId);
    if (chatUsers) {
      chatUsers.delete(userId);
      if (chatUsers.size === 0) {
        this.chatActiveUsers.delete(chatId);
      }
    }
    
    console.log(`📱 User ${userId} left chat: ${chatId}`);
  }

  /**
   * Leave all chats when user disconnects
   */
  leaveAllChats(userId) {
    const userChats = this.userActiveChats.get(userId);
    if (userChats) {
      userChats.forEach(chatId => {
        const chatUsers = this.chatActiveUsers.get(chatId);
        if (chatUsers) {
          chatUsers.delete(userId);
        }
      });
      this.userActiveChats.delete(userId);
    }
  }

  /**
   * Broadcast user status change to relevant users
   */
  async broadcastUserStatus(userId, isOnline) {
    const userData = this.userPresence.get(userId);
    if (!userData) return;
    
    // Send object to match client expectations
    const statusData = {
      userId,
      isOnline,
      lastSeen: userData.lastSeen,
      name: userData.name,
      pic: userData.pic
    };
    
    // Broadcast to all connected users
    this.io.emit('user_status_change', statusData);
    
    console.log(`📡 Broadcast ${isOnline ? 'online' : 'offline'}: ${userData.name || userId}`);
  }

  /**
   * Get all currently online users
   */
  getOnlineUsers() {
    const onlineUsers = [];
    for (const [userId, data] of this.userPresence.entries()) {
      if (data.isOnline) {
        onlineUsers.push({
          userId,
          ...data
        });
      }
    }
    return onlineUsers;
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId) {
    return this.userPresence.get(userId)?.isOnline || false;
  }

  /**
   * Get user's last seen timestamp
   */
  getLastSeen(userId) {
    return this.userPresence.get(userId)?.lastSeen || null;
  }

  /**
   * Get active users in a specific chat
   */
  getActiveUsersInChat(chatId) {
    const userIds = this.chatActiveUsers.get(chatId);
    if (!userIds) return [];
    
    return Array.from(userIds).map(userId => ({
      userId,
      ...this.userPresence.get(userId)
    }));
  }

  /**
   * Check if a user is currently in a specific chat
   */
  isUserInChat(userId, chatId) {
    const userChats = this.userActiveChats.get(userId);
    return userChats ? userChats.has(chatId) : false;
  }

  /**
   * Get socket IDs for a user
   */
  getUserSockets(userId) {
    return Array.from(this.userToSockets.get(userId) || []);
  }

  /**
   * Get user ID for a socket
   */
  getSocketUser(socketId) {
    return this.socketToUser.get(socketId);
  }

  /**
   * Get presence stats
   */
  getStats() {
    return {
      totalSockets: this.socketToUser.size,
      totalUsers: this.userToSockets.size,
      onlineUsers: this.getOnlineUsers().length,
      activeChats: this.chatActiveUsers.size
    };
  }
}

export default PresenceManager;
