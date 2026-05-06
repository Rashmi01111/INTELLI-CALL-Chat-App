/**
 * Typing Manager - Handles "user is typing..." indicators
 * Prevents spam and manages typing state per chat
 */

class TypingManager {
  constructor(io, presenceManager) {
    this.io = io;
    this.presenceManager = presenceManager;
    
    // Maps chatId -> Map(userId -> timeoutId)
    this.typingUsers = new Map();
    
    // Typing timeout duration (ms) - stops typing indicator after this time
    this.TYPING_TIMEOUT = 3000;
    
    console.log('⌨️ Typing Manager initialized');
  }

  /**
   * Handle typing_start event from a user
   */
  startTyping(socketId, chatId, userData) {
    const userId = userData.userId || userData._id;
    
    if (!userId || !chatId) {
      console.log('⚠️ Invalid typing data:', { userId, chatId });
      return;
    }
    
    // Clear any existing timeout for this user in this chat
    this.clearTypingTimeout(chatId, userId);
    
    // Track typing user
    if (!this.typingUsers.has(chatId)) {
      this.typingUsers.set(chatId, new Map());
    }
    
    const chatTypers = this.typingUsers.get(chatId);
    
    // Set timeout to automatically stop typing
    const timeoutId = setTimeout(() => {
      this.stopTyping(socketId, chatId, userData, true); // true = auto-stopped
    }, this.TYPING_TIMEOUT);
    
    chatTypers.set(userId, {
      socketId,
      userName: userData.name,
      userPic: userData.pic,
      timeoutId,
      startTime: Date.now()
    });
    
    console.log(`⌨️ ${userData.name} is typing in chat ${chatId}`);
    
    // Broadcast to other users in the chat
    this.broadcastTypingStart(chatId, userData, userId);
  }

  /**
   * Handle typing_stop event from a user
   */
  stopTyping(socketId, chatId, userData, isAutoStop = false) {
    const userId = userData.userId || userData._id;
    
    if (!userId || !chatId) return;
    
    // Clear the timeout
    this.clearTypingTimeout(chatId, userId);
    
    // Remove from typing users
    const chatTypers = this.typingUsers.get(chatId);
    if (chatTypers) {
      chatTypers.delete(userId);
      if (chatTypers.size === 0) {
        this.typingUsers.delete(chatId);
      }
    }
    
    if (!isAutoStop) {
      console.log(`⏹️ ${userData.name} stopped typing in chat ${chatId}`);
    }
    
    // Broadcast to other users in the chat
    this.broadcastTypingStop(chatId, userId);
  }

  /**
   * Clear typing timeout for a user
   */
  clearTypingTimeout(chatId, userId) {
    const chatTypers = this.typingUsers.get(chatId);
    if (chatTypers) {
      const typingData = chatTypers.get(userId);
      if (typingData?.timeoutId) {
        clearTimeout(typingData.timeoutId);
      }
    }
  }

  /**
   * Handle user disconnect - stop all their typing indicators
   */
  handleDisconnect(socketId) {
    // Find all typing instances for this socket
    for (const [chatId, chatTypers] of this.typingUsers.entries()) {
      for (const [userId, typingData] of chatTypers.entries()) {
        if (typingData.socketId === socketId) {
          this.clearTypingTimeout(chatId, userId);
          chatTypers.delete(userId);
          this.broadcastTypingStop(chatId, userId);
        }
      }
      if (chatTypers.size === 0) {
        this.typingUsers.delete(chatId);
      }
    }
  }

  /**
   * Broadcast typing_start to other users in chat
   */
  broadcastTypingStart(chatId, userData, excludeUserId) {
    const typingData = {
      chatId,
      userId: excludeUserId,
      userName: userData.name,
      userPic: userData.pic,
      timestamp: Date.now()
    };
    
    // Emit to chat room (all sockets in the room except sender)
    this.io.to(chatId).emit('user_typing', typingData);
    
    // Also emit a simplified version for UI display
    this.io.to(chatId).emit('typing_start', {
      chatId,
      userId: excludeUserId,
      userName: userData.name
    });
  }

  /**
   * Broadcast typing_stop to other users in chat
   */
  broadcastTypingStop(chatId, excludeUserId) {
    const data = {
      chatId,
      userId: excludeUserId,
      timestamp: Date.now()
    };
    
    this.io.to(chatId).emit('user_stopped_typing', data);
    this.io.to(chatId).emit('typing_stop', data);
  }

  /**
   * Get currently typing users in a chat
   */
  getTypingUsers(chatId) {
    const chatTypers = this.typingUsers.get(chatId);
    if (!chatTypers) return [];
    
    return Array.from(chatTypers.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
      userPic: data.userPic,
      typingDuration: Date.now() - data.startTime
    }));
  }

  /**
   * Format typing indicator text for UI display
   */
  getTypingIndicatorText(chatId) {
    const typingUsers = this.getTypingUsers(chatId);
    
    if (typingUsers.length === 0) {
      return null;
    }
    
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing...`;
    }
    
    if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    }
    
    return `${typingUsers.length} people are typing...`;
  }

  /**
   * Get typing stats for monitoring
   */
  getStats() {
    let totalTypers = 0;
    for (const chatTypers of this.typingUsers.values()) {
      totalTypers += chatTypers.size;
    }
    
    return {
      activeTypingChats: this.typingUsers.size,
      totalTypingUsers: totalTypers
    };
  }
}

export default TypingManager;
