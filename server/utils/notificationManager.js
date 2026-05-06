/**
 * Notification Manager - Smart notifications for messages
 * Sends notifications only when user is not actively viewing the chat
 * Supports FCM (Firebase Cloud Messaging) integration
 */

class NotificationManager {
  constructor(io, presenceManager) {
    this.io = io;
    this.presenceManager = presenceManager;
    
    // User notification preferences (in-memory cache, should persist to DB in production)
    this.userPreferences = new Map();
    
    // FCM tokens for push notifications
    this.fcmTokens = new Map();
    
    // Queued notifications for offline users (delivered when they come online)
    this.notificationQueue = new Map();
    
    console.log('🔔 Notification Manager initialized');
  }

  /**
   * Handle new message and decide whether to notify
   */
  async handleNewMessage(message, chatParticipants) {
    const senderId = message.senderId?.toString();
    const chatId = message.chatId?.toString() || message.groupId?.toString();
    
    if (!chatId || !chatParticipants) return;
    
    // Notify each participant except sender
    for (const participantId of chatParticipants) {
      const participantIdStr = participantId.toString ? participantId.toString() : participantId;
      
      if (participantIdStr === senderId) continue;
      
      const shouldNotify = this.shouldNotifyUser(participantIdStr, chatId);
      
      if (shouldNotify) {
        await this.sendNotification(participantIdStr, {
          type: 'new_message',
          chatId,
          messageId: message.id,
          senderId: senderId,
          senderName: message.user,
          text: this.truncateText(message.text, 100),
          hasMedia: !!(message.image || message.video || message.audio),
          timestamp: Date.now()
        });
      } else {
        console.log(`🔕 No notification sent to ${participantIdStr} - user is active in chat`);
      }
    }
  }

  /**
   * Determine if user should be notified
   * Rules:
   * - Don't notify if user is currently viewing the chat
   * - Don't notify if user is online but muted the chat
   * - Always queue for offline users
   */
  shouldNotifyUser(userId, chatId) {
    // Check if user is online
    const isOnline = this.presenceManager.isUserOnline(userId);
    
    if (!isOnline) {
      // User is offline - queue for later delivery
      return 'queue';
    }
    
    // Check if user is currently viewing this chat
    const isInChat = this.presenceManager.isUserInChat(userId, chatId);
    if (isInChat) {
      return false;
    }
    
    // Check user preferences
    const prefs = this.userPreferences.get(userId);
    if (prefs?.mutedChats?.includes(chatId)) {
      return false;
    }
    
    // Check global mute
    if (prefs?.globalMute) {
      return false;
    }
    
    return true;
  }

  /**
   * Send notification to user (in-app + push if enabled)
   */
  async sendNotification(userId, notificationData) {
    console.log(`🔔 Sending notification to ${userId}:`, notificationData.type);
    
    // Send in-app notification via socket
    this.sendInAppNotification(userId, notificationData);
    
    // Send push notification if FCM token exists
    if (this.fcmTokens.has(userId)) {
      await this.sendPushNotification(userId, notificationData);
    }
  }

  /**
   * Send in-app notification via Socket.io
   */
  sendInAppNotification(userId, notificationData) {
    const userSockets = this.presenceManager.getUserSockets(userId);
    
    // Emit to all user's sockets (multi-device support)
    userSockets.forEach(socketId => {
      this.io.to(socketId).emit('notification', {
        ...notificationData,
        id: this.generateNotificationId(),
        read: false
      });
    });
    
    // Also emit to user's room for broader reach
    this.io.to(userId).emit('send_notification', notificationData);
    this.io.to(userId).emit('new_message_notification', notificationData);
  }

  /**
   * Send push notification via Firebase Cloud Messaging
   * (Placeholder - requires FCM setup)
   */
  async sendPushNotification(userId, notificationData) {
    const fcmToken = this.fcmTokens.get(userId);
    if (!fcmToken) return;
    
    // FCM integration would go here
    // This requires the firebase-admin SDK to be set up
    console.log(`📱 Push notification would be sent to ${userId} (FCM not configured)`);
    
    /*
    Example FCM implementation:
    
    const message = {
      token: fcmToken,
      notification: {
        title: notificationData.senderName,
        body: notificationData.text || 'Sent a message',
      },
      data: {
        type: notificationData.type,
        chatId: notificationData.chatId,
        messageId: notificationData.messageId,
        click_action: 'OPEN_CHAT'
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'messages',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };
    
    try {
      await admin.messaging().send(message);
    } catch (error) {
      console.error('FCM send error:', error);
    }
    */
  }

  /**
   * Register FCM token for a user
   */
  registerFCMToken(userId, token) {
    this.fcmTokens.set(userId, token);
    console.log(`📱 FCM token registered for ${userId}`);
  }

  /**
   * Update user notification preferences
   */
  updatePreferences(userId, preferences) {
    this.userPreferences.set(userId, {
      ...this.userPreferences.get(userId),
      ...preferences,
      updatedAt: Date.now()
    });
    console.log(`⚙️ Notification preferences updated for ${userId}`);
  }

  /**
   * Mute/unmute a chat for a user
   */
  toggleChatMute(userId, chatId, shouldMute) {
    const prefs = this.userPreferences.get(userId) || {};
    const mutedChats = new Set(prefs.mutedChats || []);
    
    if (shouldMute) {
      mutedChats.add(chatId);
    } else {
      mutedChats.delete(chatId);
    }
    
    this.updatePreferences(userId, {
      mutedChats: Array.from(mutedChats)
    });
  }

  /**
   * Queue notification for offline user
   */
  queueNotification(userId, notificationData) {
    if (!this.notificationQueue.has(userId)) {
      this.notificationQueue.set(userId, []);
    }
    
    const queue = this.notificationQueue.get(userId);
    queue.push({
      ...notificationData,
      queuedAt: Date.now()
    });
    
    // Limit queue size
    if (queue.length > 100) {
      queue.shift(); // Remove oldest
    }
    
    console.log(`📬 Notification queued for offline user ${userId}`);
  }

  /**
   * Deliver queued notifications when user comes online
   */
  async deliverQueuedNotifications(userId) {
    const queue = this.notificationQueue.get(userId);
    if (!queue || queue.length === 0) return;
    
    console.log(`📬 Delivering ${queue.length} queued notifications to ${userId}`);
    
    // Send all queued notifications
    for (const notification of queue) {
      this.sendInAppNotification(userId, notification);
    }
    
    // Clear queue
    this.notificationQueue.delete(userId);
    
    // Notify client that queued messages were delivered
    this.io.to(userId).emit('queued_notifications_delivered', {
      count: queue.length
    });
  }

  /**
   * Mark notifications as read for a chat
   */
  markNotificationsAsRead(userId, chatId) {
    this.io.to(userId).emit('notifications_read', { chatId });
  }

  /**
   * Generate unique notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Truncate text for notification preview
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get notification stats
   */
  getStats() {
    let queuedCount = 0;
    for (const queue of this.notificationQueue.values()) {
      queuedCount += queue.length;
    }
    
    return {
      registeredFCMTokens: this.fcmTokens.size,
      queuedNotifications: queuedCount,
      usersWithPreferences: this.userPreferences.size
    };
  }
}

export default NotificationManager;
