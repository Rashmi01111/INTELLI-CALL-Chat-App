/**
 * Chat Socket Handler - Manages real-time chat events
 * Handles: messages, read receipts, typing, presence
 */

import mongoose from 'mongoose';

class ChatSocketHandler {
  constructor(io, presenceManager, typingManager, notificationManager) {
    this.io = io;
    this.presenceManager = presenceManager;
    this.typingManager = typingManager;
    this.notificationManager = notificationManager;
    
    console.log('💬 Chat Socket Handler initialized');
  }

  /**
   * Initialize socket event handlers for a connected socket
   */
  initialize(socket, models) {
    const { Message, Chat, User, Group } = models;
    
    // ==========================================
    // USER SETUP & PRESENCE
    // ==========================================
    
    socket.on('setup', async (userData) => {
      if (!userData?._id) {
        socket.emit('setup_error', { message: 'User ID required' });
        return;
      }
      
      try {
        const userId = userData._id.toString();
        
        // Register with presence manager
        const wasOffline = await this.presenceManager.userConnected(
          socket.id, 
          userId, 
          {
            name: userData.name,
            pic: userData.pic,
            email: userData.email
          }
        );
        
        // Join user's personal room for targeted messages
        socket.join(userId);
        
        // If user came back online, deliver queued notifications
        if (wasOffline) {
          await this.notificationManager.deliverQueuedNotifications(userId);
        }
        
        // Send online users list
        const onlineUsers = this.presenceManager.getOnlineUsers();
        socket.emit('online_users', onlineUsers);
        
        // Confirm connection
        socket.emit('connected', {
          socketId: socket.id,
          onlineUserCount: onlineUsers.length
        });
        
        console.log(`👤 User setup complete: ${userData.name} (${userId})`);
        
      } catch (error) {
        console.error('Setup error:', error);
        socket.emit('setup_error', { message: 'Setup failed' });
      }
    });

    // Handle request for online users list
    socket.on('get_online_users', () => {
      const onlineUsers = this.presenceManager.getOnlineUsers();
      socket.emit('online_users', onlineUsers);
    });

    // ==========================================
    // CHAT ROOM MANAGEMENT
    // ==========================================
    
    socket.on('join_chat', (chatId) => {
      const userId = this.presenceManager.getSocketUser(socket.id);
      if (!userId) return;
      
      socket.join(chatId);
      this.presenceManager.userJoinChat(userId, chatId);
      
      // Notify other users in chat
      socket.to(chatId).emit('user_joined_chat', {
        chatId,
        userId,
        timestamp: Date.now()
      });
      
      console.log(`📱 User ${userId} joined chat room: ${chatId}`);
    });

    socket.on('leave_chat', (chatId) => {
      const userId = this.presenceManager.getSocketUser(socket.id);
      if (!userId) return;
      
      socket.leave(chatId);
      this.presenceManager.userLeaveChat(userId, chatId);
      
      socket.to(chatId).emit('user_left_chat', {
        chatId,
        userId,
        timestamp: Date.now()
      });
      
      console.log(`📱 User ${userId} left chat room: ${chatId}`);
    });

    // ==========================================
    // TYPING INDICATORS
    // ==========================================
    
    socket.on('typing_start', (data) => {
      const userId = this.presenceManager.getSocketUser(socket.id);
      if (!userId) return;
      
      this.typingManager.startTyping(socket.id, data.chatId, {
        userId,
        name: data.userName,
        pic: data.userPic
      });
    });

    socket.on('typing_stop', (data) => {
      const userId = this.presenceManager.getSocketUser(socket.id);
      if (!userId) return;
      
      this.typingManager.stopTyping(socket.id, data.chatId, {
        userId,
        name: data.userName
      });
    });

    // Legacy event support
    socket.on('typing', (data) => {
      const userId = this.presenceManager.getSocketUser(socket.id);
      if (!userId) return;
      
      this.typingManager.startTyping(socket.id, data.room || data.chatId, {
        userId,
        name: data.userName,
        pic: data.userPic
      });
    });

    socket.on('stop typing', (data) => {
      const userId = this.presenceManager.getSocketUser(socket.id);
      if (!userId) return;
      
      this.typingManager.stopTyping(socket.id, data.room || data.chatId, {
        userId,
        name: data.userName
      });
    });

    // ==========================================
    // MESSAGE HANDLING
    // ==========================================

    const broadcastGhostDeletion = async (messageId) => {
      try {
        const msg = mongoose.connection.readyState === 1
          ? await Message.findOne({ id: messageId }).lean()
          : null;

        if (mongoose.connection.readyState === 1) {
          await Message.deleteOne({ id: messageId });
        }

        const payload = { messageId, timestamp: Date.now().toString() };

        if (msg?.groupId) {
          this.io.to(String(msg.groupId)).emit('ghost_message_deleted', payload);
          if (msg.senderId) this.io.to(String(msg.senderId)).emit('ghost_message_deleted', payload);
          return;
        }

        if (msg?.to) {
          const recipient = await User.findOne({ name: msg.to }).select('_id').lean();
          if (recipient?._id) this.io.to(String(recipient._id)).emit('ghost_message_deleted', payload);
          if (msg.senderId) this.io.to(String(msg.senderId)).emit('ghost_message_deleted', payload);
          return;
        }

        this.io.emit('ghost_message_deleted', payload);
      } catch (e) {
        console.error('Ghost deletion broadcast failed:', e);
      }
    };

    const handleSendMessage = async (data) => {
      const presenceUserId = this.presenceManager.getSocketUser(socket.id);
      const fallbackUserId = data?.sender?._id || data?.senderId || data?._id;
      const userId = presenceUserId || fallbackUserId;

      if (!userId) {
        socket.emit('message_error', { message: 'Not authenticated' });
        return;
      }

      try {
        const messageData = this.buildMessageData(data, userId);

        // Save to database
        let savedMessage;
        if (mongoose.connection.readyState === 1) {
          savedMessage = await Message.create(messageData);
        }

        // Get chat participants for targeted delivery
        const participants = await this.getChatParticipants(data, User, Group);

        // Broadcast to chat room
        if (data.groupId) {
          this.io.to(data.groupId).emit('receive_message', {
            ...messageData,
            deliveryStatus: 'delivered',
            deliveredAt: new Date()
          });
        } else if (data.to) {
          const recipient = await User.findOne({ name: data.to });
          if (recipient) {
            this.io.to(recipient._id.toString()).emit('receive_message', {
              ...messageData,
              deliveryStatus: 'delivered',
              deliveredAt: new Date()
            });
            this.io.to(String(userId)).emit('message_sent', messageData);
          }
        } else {
          socket.broadcast.emit('receive_message', {
            ...messageData,
            deliveryStatus: 'delivered',
            deliveredAt: new Date()
          });
        }

        // Ghost messages: enforce 60s expiry server-side too (sync + DB cleanup)
        if (messageData.isGhost) {
          setTimeout(() => {
            broadcastGhostDeletion(messageData.id);
          }, 60 * 1000);
        }

        // Mark as delivered to online recipients
        for (const participantId of participants) {
          if (participantId.toString() !== String(userId)) {
            const isOnline = this.presenceManager.isUserOnline(participantId.toString());
            if (isOnline && savedMessage?.markDelivered) {
              await savedMessage.markDelivered(participantId);
            }
          }
        }

        await this.notificationManager.handleNewMessage(messageData, participants);

        socket.emit('message_delivered', {
          messageId: messageData.id,
          deliveredAt: new Date()
        });
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    };

    socket.on('send_message', handleSendMessage);

    // Ghost message deletion sync (clients emit this after local 60s timer)
    socket.on('delete_ghost_message', async (data) => {
      try {
        const { messageId } = data || {};
        if (!messageId) return;

        const msg = mongoose.connection.readyState === 1
          ? await Message.findOne({ id: messageId }).lean()
          : null;

        // Remove from DB (best-effort)
        if (mongoose.connection.readyState === 1) {
          await Message.deleteOne({ id: messageId });
        }

        const payload = { messageId, timestamp: Date.now().toString() };

        if (msg?.groupId) {
          this.io.to(String(msg.groupId)).emit('ghost_message_deleted', payload);
          if (msg.senderId) this.io.to(String(msg.senderId)).emit('ghost_message_deleted', payload);
          return;
        }

        if (msg?.to) {
          const recipient = await User.findOne({ name: msg.to }).select('_id').lean();
          if (recipient?._id) {
            this.io.to(String(recipient._id)).emit('ghost_message_deleted', payload);
          }
          if (msg.senderId) this.io.to(String(msg.senderId)).emit('ghost_message_deleted', payload);
          return;
        }

        // Global fallback
        this.io.emit('ghost_message_deleted', payload);
      } catch (e) {
        console.error('delete_ghost_message error:', e);
      }
    });

    // Legacy support
    socket.on('new message', async (data) => {
      await handleSendMessage(data);
    });

    // ==========================================
    // READ RECEIPTS
    // ==========================================
    
    socket.on('mark_message_read', async (data) => {
      const { messageId, userId } = data;
      
      try {
        // Update in database
        if (mongoose.connection.readyState === 1) {
          await Message.updateOne(
            { id: messageId },
            {
              $addToSet: {
                readBy: {
                  userId: new mongoose.Types.ObjectId(userId),
                  readAt: new Date()
                }
              },
              $set: {
                deliveryStatus: 'read',
                readAt: new Date()
              }
            }
          );
          
          // Get message to find sender
          const message = await Message.findOne({ id: messageId });
          
          if (message) {
            // Notify sender
            this.io.to(message.senderId.toString()).emit('message_read', {
              messageId,
              readBy: userId,
              readAt: new Date()
            });
            
            // Broadcast to chat
            const chatId = message.chatId || message.groupId;
            if (chatId) {
              this.io.to(chatId.toString()).emit('message_status_updated', {
                messageId,
                status: 'read',
                readBy: userId,
                readAt: new Date()
              });
            }
          }
        }
        
        socket.emit('message_marked_read', { messageId, success: true });
        
      } catch (error) {
        console.error('Mark read error:', error);
        socket.emit('message_marked_read', { messageId, success: false, error: error.message });
      }
    });

    socket.on('mark_chat_read', async (data) => {
      const { chatId, userId, chatType } = data;
      
      try {
        // Bulk update all unread messages in chat
        const result = await Message.updateMany(
          {
            $or: [
              { chatId: chatId },
              { groupId: chatId }
            ],
            senderId: { $ne: new mongoose.Types.ObjectId(userId) },
            'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) }
          },
          {
            $addToSet: {
              readBy: {
                userId: new mongoose.Types.ObjectId(userId),
                readAt: new Date()
              }
            }
          }
        );
        
        console.log(`📖 Marked ${result.modifiedCount} messages as read in chat ${chatId}`);
        
        socket.emit('chat_marked_read', {
          chatId,
          messagesRead: result.modifiedCount
        });
        
        // Notify other participants
        socket.to(chatId).emit('user_read_chat', {
          chatId,
          userId,
          timestamp: Date.now()
        });
        
      } catch (error) {
        console.error('Mark chat read error:', error);
      }
    });

    // ==========================================
    // MESSAGE REACTIONS
    // ==========================================
    
    socket.on('add_reaction', async (data) => {
      const { messageId, emoji, userId } = data;
      
      try {
        const message = await Message.findOne({ id: messageId });
        if (!message) return;
        
        const reactions = message.reactions || {};
        
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }
        
        const userIndex = reactions[emoji].indexOf(userId);
        if (userIndex > -1) {
          reactions[emoji].splice(userIndex, 1);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji].push(userId);
        }
        
        await Message.updateOne({ id: messageId }, { $set: { reactions } });
        
        // Broadcast reaction update
        const chatId = message.chatId || message.groupId;
        const broadcastTarget = chatId || this.io;
        
        broadcastTarget.emit('reaction_updated', {
          messageId,
          reactions,
          updatedBy: userId
        });
        
      } catch (error) {
        console.error('Add reaction error:', error);
      }
    });

    // ==========================================
    // DISCONNECT HANDLING
    // ==========================================
    
    socket.on('disconnect', async (reason) => {
      const result = await this.presenceManager.userDisconnected(socket.id);
      
      if (result?.isOffline) {
        // Clear typing indicators
        this.typingManager.handleDisconnect(socket.id);
        
        // Update user's last seen in database
        if (mongoose.connection.readyState === 1) {
          try {
            await User.findByIdAndUpdate(result.userId, {
              isOnline: false,
              lastSeen: new Date()
            });
          } catch (error) {
            console.error('Error updating user offline status:', error);
          }
        }
      }
      
      console.log(`🔌 Socket disconnected: ${socket.id}, reason: ${reason}`);
    });
  }

  /**
   * Build standardized message data
   */
  buildMessageData(data, senderId) {
    return {
      id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user: data.user || data.sender?.name,
      senderId: new mongoose.Types.ObjectId(senderId),
      to: data.to,
      groupId: data.groupId ? new mongoose.Types.ObjectId(data.groupId) : undefined,
      chatId: data.chatId ? new mongoose.Types.ObjectId(data.chatId) : undefined,
      text: data.text || data.content,
      originalText: data.originalText,
      translatedText: data.translatedText,
      translateTargetLang: data.translateTargetLang || data.outgoingTargetLang || data.targetLanguage,
      image: data.image,
      video: data.video,
      audio: data.audio,
      timestamp: data.timestamp || new Date().toISOString(),
      createdAt: new Date(),
      profilePic: data.profilePic || data.sender?.pic,
      isGhost: data.isGhost || false,
      isAI: data.isAI || false,
      isBlind: data.isBlind || false,
      isSystem: data.isSystem || false,
      reelId: data.reelId,
      reelData: data.reelData,
      isForwarded: data.isForwarded || false,
      forwardedFrom: data.forwardedFrom,
      originalMessageId: data.originalMessageId,
      deliveryStatus: 'sent',
      readBy: [],
      deliveredTo: [],
      reactions: {}
    };
  }

  /**
   * Get chat participants for targeted message delivery
   */
  async getChatParticipants(data, User, Group) {
    const participants = [];
    
    if (data.groupId) {
      // Group chat
      const group = await Group.findById(data.groupId);
      if (group) {
        participants.push(...group.members);
      }
    } else if (data.to) {
      // Private chat
      const recipient = await User.findOne({ name: data.to });
      if (recipient) {
        participants.push(recipient._id);
      }
    }
    
    return participants;
  }
}

export default ChatSocketHandler;
