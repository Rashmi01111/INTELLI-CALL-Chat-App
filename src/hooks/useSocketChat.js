import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * useSocketChat Hook - Advanced chat functionality with WhatsApp-like features
 * Features: Read receipts, typing indicators, presence, notifications
 */

const getServerUrl = () => {
  // Check for VITE_SERVER_URL first (set in .env for remote deployment)
  const envUrl = import.meta.env.VITE_SERVER_URL;
  if (envUrl) return envUrl;
  // Fallback to VITE_SOCKET_URL or localhost
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:3009';
};

const SOCKET_URL = getServerUrl();

export const useSocketChat = (user) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Map()); // chatId -> typing users
  const [unreadCounts, setUnreadCounts] = useState({});
  const [notifications, setNotifications] = useState([]);
  
  const socketRef = useRef(null);
  const typingTimeoutsRef = useRef({}); // Track typing timeout IDs
  
  // Message status callback refs for external state updates
  const messageStatusCallbacksRef = useRef({});

  // Initialize socket connection
  useEffect(() => {
    if (!user?._id) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔌 Socket connected');
      setIsConnected(true);
      
      // Authenticate with user data
      newSocket.emit('setup', user);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('✅ Socket authenticated:', data);
    });

    // Online presence events
    newSocket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('user_status_change', (status) => {
      setOnlineUsers(prev => {
        const filtered = prev.filter(u => u.userId !== status.userId);
        if (status.isOnline) {
          return [...filtered, status];
        }
        return filtered;
      });
    });

    // Typing indicator events
    newSocket.on('user_typing', (data) => {
      setTypingUsers(prev => {
        const chatTypers = new Map(prev);
        const existing = chatTypers.get(data.chatId) || [];
        
        // Add/update typing user
        const updated = existing.filter(u => u.userId !== data.userId);
        updated.push({
          userId: data.userId,
          userName: data.userName,
          userPic: data.userPic,
          timestamp: Date.now()
        });
        
        chatTypers.set(data.chatId, updated);
        return chatTypers;
      });

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setTypingUsers(prev => {
          const chatTypers = new Map(prev);
          const existing = chatTypers.get(data.chatId) || [];
          chatTypers.set(
            data.chatId,
            existing.filter(u => u.userId !== data.userId)
          );
          return chatTypers;
        });
      }, 5000);
    });

    newSocket.on('user_stopped_typing', (data) => {
      setTypingUsers(prev => {
        const chatTypers = new Map(prev);
        const existing = chatTypers.get(data.chatId) || [];
        chatTypers.set(
          data.chatId,
          existing.filter(u => u.userId !== data.userId)
        );
        return chatTypers;
      });
    });

    // Read receipt events
    newSocket.on('message_read', (data) => {
      // Update local message read status
      console.log('📖 Message read:', data);
      // Trigger callback for external state update
      if (messageStatusCallbacksRef.current.onMessageRead) {
        messageStatusCallbacksRef.current.onMessageRead(data);
      }
    });

    newSocket.on('message_status_updated', (data) => {
      console.log('📖 Message status updated:', data);
      // Trigger callback for external state update
      if (messageStatusCallbacksRef.current.onMessageStatusUpdated) {
        messageStatusCallbacksRef.current.onMessageStatusUpdated(data);
      }
    });

    // Notification events
    newSocket.on('notification', (notification) => {
      setNotifications(prev => [...prev, notification]);
      
      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    });

    newSocket.on('send_notification', (data) => {
      console.log('🔔 Notification:', data);
    });

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, [user?._id]);

  // Join a chat room
  const joinChat = useCallback((chatId) => {
    if (socket) {
      socket.emit('join_chat', chatId);
    }
  }, [socket]);

  // Leave a chat room
  const leaveChat = useCallback((chatId) => {
    if (socket) {
      socket.emit('leave_chat', chatId);
    }
  }, [socket]);

  // Send typing indicator
  const sendTypingStart = useCallback((chatId, chatType = 'private') => {
    if (socket && user) {
      // Clear any existing timeout
      if (typingTimeoutsRef.current[chatId]) {
        clearTimeout(typingTimeoutsRef.current[chatId]);
      }

      socket.emit('typing_start', {
        chatId,
        chatType,
        userId: user._id,
        userName: user.name,
        userPic: user.pic
      });

      // Auto-stop typing after 3 seconds of inactivity
      typingTimeoutsRef.current[chatId] = setTimeout(() => {
        sendTypingStop(chatId);
      }, 3000);
    }
  }, [socket, user]);

  // Stop typing indicator
  const sendTypingStop = useCallback((chatId) => {
    if (socket && user) {
      // Clear timeout
      if (typingTimeoutsRef.current[chatId]) {
        clearTimeout(typingTimeoutsRef.current[chatId]);
        delete typingTimeoutsRef.current[chatId];
      }

      socket.emit('typing_stop', {
        chatId,
        userId: user._id,
        userName: user.name
      });
    }
  }, [socket, user]);

  // Mark message as read
  const markMessageRead = useCallback((messageId, chatId) => {
    if (socket && user) {
      socket.emit('mark_message_read', {
        messageId,
        userId: user._id,
        chatId
      });
    }
  }, [socket, user]);

  // Mark all messages in chat as read
  const markChatRead = useCallback((chatId) => {
    if (socket && user) {
      socket.emit('mark_chat_read', {
        chatId,
        userId: user._id
      });
      
      // Update local unread count
      setUnreadCounts(prev => ({
        ...prev,
        [chatId]: 0
      }));
    }
  }, [socket, user]);

  // Send message
  const sendMessage = useCallback((messageData) => {
    if (socket && user) {
      const enrichedMessage = {
        ...messageData,
        sender: {
          _id: user._id,
          name: user.name,
          pic: user.pic
        }
      };

      socket.emit('send_message', enrichedMessage);
      
      // Stop typing when message is sent
      if (messageData.chatId) {
        sendTypingStop(messageData.chatId);
      }
    }
  }, [socket, user, sendTypingStop]);

  // Check if user is online
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.some(u => u.userId === userId);
  }, [onlineUsers]);

  // Get user's last seen
  const getUserLastSeen = useCallback((userId) => {
    const user = onlineUsers.find(u => u.userId === userId);
    return user?.lastSeen || null;
  }, [onlineUsers]);

  // Get typing indicator text for a chat
  const getTypingIndicatorText = useCallback((chatId) => {
    const typers = typingUsers.get(chatId) || [];
    
    if (typers.length === 0) return null;
    if (typers.length === 1) return `${typers[0].userName} is typing...`;
    if (typers.length === 2) return `${typers[0].userName} and ${typers[1].userName} are typing...`;
    return `${typers.length} people are typing...`;
  }, [typingUsers]);

  // Dismiss notification
  const dismissNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Register callback for message status updates
  const registerMessageStatusCallback = useCallback((callbacks) => {
    messageStatusCallbacksRef.current = { ...messageStatusCallbacksRef.current, ...callbacks };
  }, []);

  // Unregister callback
  const unregisterMessageStatusCallback = useCallback((callbackNames) => {
    callbackNames.forEach(name => {
      delete messageStatusCallbacksRef.current[name];
    });
  }, []);

  return {
    // Socket state
    socket,
    isConnected,
    
    // Online presence
    onlineUsers,
    isUserOnline,
    getUserLastSeen,
    
    // Typing indicators
    typingUsers,
    getTypingIndicatorText,
    sendTypingStart,
    sendTypingStop,
    
    // Chat management
    joinChat,
    leaveChat,
    
    // Read receipts
    markMessageRead,
    markChatRead,
    registerMessageStatusCallback,
    unregisterMessageStatusCallback,
    
    // Messaging
    sendMessage,
    
    // Notifications
    notifications,
    dismissNotification,
    unreadCounts
  };
};

export default useSocketChat;
