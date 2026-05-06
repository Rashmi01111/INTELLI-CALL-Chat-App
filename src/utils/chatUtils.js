/**
 * Chat Utilities - Helper functions for chat features
 */

/**
 * Format timestamp for message display
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  return date.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Format date for chat headers (Today, Yesterday, or date)
 */
export const formatChatDate = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
};

/**
 * Truncate message text for previews
 */
export const truncateMessage = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Generate unique message ID
 */
export const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate unique chat ID for private conversations
 */
export const generatePrivateChatId = (userId1, userId2) => {
  const sorted = [userId1, userId2].sort();
  return `private_${sorted[0]}_${sorted[1]}`;
};

/**
 * Check if message is from today
 */
export const isToday = (timestamp) => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const now = new Date();
  return date.toDateString() === now.toDateString();
};

/**
 * Group messages by date
 */
export const groupMessagesByDate = (messages) => {
  const groups = {};
  
  messages.forEach(msg => {
    const date = new Date(msg.timestamp || msg.createdAt);
    const dateKey = date.toDateString();
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: date,
        label: formatChatDate(date),
        messages: []
      };
    }
    
    groups[dateKey].messages.push(msg);
  });
  
  return Object.values(groups).sort((a, b) => a.date - b.date);
};

/**
 * Get unread message count for a specific chat
 */
export const getUnreadCount = (messages, currentUserId, chatId) => {
  if (!messages || !currentUserId) return 0;
  
  return messages.filter(msg => {
    // Skip own messages
    if (msg.senderId === currentUserId || msg.user === currentUserId) return false;
    
    // Skip already read
    if (msg.readBy?.some(r => r.userId === currentUserId || r === currentUserId)) return false;
    if (msg.isReadByMe) return false;
    
    // Check if message belongs to this chat
    if (msg.chatId === chatId || msg.groupId === chatId) return true;
    
    return false;
  }).length;
};

/**
 * Sort chats by last activity (most recent first)
 */
export const sortChatsByActivity = (chats) => {
  return [...chats].sort((a, b) => {
    const aTime = a.lastMessage?.timestamp || a.updatedAt || 0;
    const bTime = b.lastMessage?.timestamp || b.updatedAt || 0;
    return new Date(bTime) - new Date(aTime);
  });
};

/**
 * Get message type (text, image, video, audio, etc.)
 */
export const getMessageType = (message) => {
  if (message.image) return 'image';
  if (message.video) return 'video';
  if (message.audio) return 'audio';
  if (message.reelId) return 'reel';
  if (message.isSystem) return 'system';
  if (message.isAI) return 'ai';
  return 'text';
};

/**
 * Get message preview text based on type
 */
export const getMessagePreview = (message) => {
  const type = getMessageType(message);
  
  switch (type) {
    case 'image':
      return '📷 Photo';
    case 'video':
      return message.reelId ? '📸 Reel' : '🎥 Video';
    case 'audio':
      return '🎤 Voice message';
    case 'system':
      return message.text || 'System message';
    case 'ai':
      return '🤖 AI message';
    default:
      return message.text || '';
  }
};

/**
 * Debounce function for performance optimization
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for rate limiting
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Parse emoji reactions from message
 */
export const parseReactions = (reactions) => {
  if (!reactions) return [];
  
  return Object.entries(reactions).map(([emoji, users]) => ({
    emoji,
    count: users.length,
    users
  }));
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Scroll to bottom of chat container
 */
export const scrollToBottom = (containerRef, smooth = true) => {
  if (containerRef.current) {
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }
};

/**
 * Check if user is at bottom of chat (for auto-scroll)
 */
export const isAtBottom = (containerRef, threshold = 100) => {
  if (!containerRef.current) return false;
  
  const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
  return scrollHeight - scrollTop - clientHeight < threshold;
};

export default {
  formatMessageTime,
  formatChatDate,
  truncateMessage,
  generateMessageId,
  generatePrivateChatId,
  isToday,
  groupMessagesByDate,
  getUnreadCount,
  sortChatsByActivity,
  getMessageType,
  getMessagePreview,
  debounce,
  throttle,
  parseReactions,
  formatFileSize,
  scrollToBottom,
  isAtBottom
};
