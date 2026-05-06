import { useState, useCallback, useEffect } from 'react';

/**
 * useReadReceipts Hook - WhatsApp-style read receipt management
 * Handles: sent (✓), delivered (✓✓), read (blue ✓✓)
 */

const getServerUrl = () => {
  // Check for VITE_SERVER_URL first (set in .env for remote deployment)
  const envUrl = import.meta.env.VITE_SERVER_URL;
  if (envUrl) return envUrl;
  // Fallback to VITE_API_URL or localhost
  return import.meta.env.VITE_API_URL || 'http://localhost:3009';
};

const API_URL = getServerUrl();

export const useReadReceipts = (socket, user) => {
  const [messageStatuses, setMessageStatuses] = useState({}); // messageId -> status

  // Listen for read receipt events
  useEffect(() => {
    if (!socket) return;

    const handleMessageRead = (data) => {
      setMessageStatuses(prev => ({
        ...prev,
        [data.messageId]: {
          status: 'read',
          readBy: [...(prev[data.messageId]?.readBy || []), data.readBy],
          readAt: data.readAt
        }
      }));
    };

    const handleMessageDelivered = (data) => {
      setMessageStatuses(prev => ({
        ...prev,
        [data.messageId]: {
          ...prev[data.messageId],
          status: 'delivered',
          deliveredAt: data.deliveredAt
        }
      }));
    };

    const handleMessageStatusUpdated = (data) => {
      setMessageStatuses(prev => ({
        ...prev,
        [data.messageId]: {
          status: data.status,
          readBy: data.readBy,
          readAt: data.readAt,
          deliveredAt: data.deliveredAt
        }
      }));
    };

    socket.on('message_read', handleMessageRead);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('message_status_updated', handleMessageStatusUpdated);

    return () => {
      socket.off('message_read', handleMessageRead);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('message_status_updated', handleMessageStatusUpdated);
    };
  }, [socket]);

  /**
   * Mark a single message as read
   */
  const markMessageAsRead = useCallback(async (messageId, chatId) => {
    if (!user?._id || !messageId) return;

    // Emit via socket for real-time update
    if (socket) {
      socket.emit('mark_message_read', {
        messageId,
        userId: user._id,
        chatId
      });
    }

    // Also make API call for persistence
    try {
      await fetch(`${API_URL}/api/chat/${chatId}/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          messageIds: [messageId]
        })
      });
    } catch (error) {
      console.error('Mark message read error:', error);
    }
  }, [socket, user]);

  /**
   * Mark all messages in a chat as read (bulk update)
   */
  const markAllAsRead = useCallback(async (chatId) => {
    if (!user?._id || !chatId) return;

    // Emit via socket
    if (socket) {
      socket.emit('mark_chat_read', {
        chatId,
        userId: user._id
      });
    }

    // API call for bulk update
    try {
      const response = await fetch(`${API_URL}/api/chat/${chatId}/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      });

      const data = await response.json();
      return data.modifiedCount || 0;
    } catch (error) {
      console.error('Mark all read error:', error);
      return 0;
    }
  }, [socket, user]);

  /**
   * Mark messages as delivered (called when user receives messages)
   */
  const markMessagesAsDelivered = useCallback(async (chatId, messageIds) => {
    if (!user?._id || !chatId || !messageIds?.length) return;

    try {
      await fetch(`${API_URL}/api/chat/${chatId}/mark-delivered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          messageIds
        })
      });
    } catch (error) {
      console.error('Mark delivered error:', error);
    }
  }, [user]);

  /**
   * Get read receipt status for a message
   * Returns: 'sent' | 'delivered' | 'read'
   */
  const getMessageStatus = useCallback((messageId) => {
    return messageStatuses[messageId]?.status || 'sent';
  }, [messageStatuses]);

  /**
   * Check if message is read by everyone
   */
  const isReadByAll = useCallback((messageId, totalParticipants) => {
    const status = messageStatuses[messageId];
    if (!status) return false;
    
    const readByCount = status.readBy?.length || 0;
    // Subtract 1 for sender
    return readByCount >= (totalParticipants - 1);
  }, [messageStatuses]);

  /**
   * Get formatted read receipt display
   * WhatsApp style: ✓ = sent, ✓✓ = delivered, blue ✓✓ = read
   */
  const getReadReceiptDisplay = useCallback((messageId, isOwnMessage = false) => {
    const status = getMessageStatus(messageId);
    
    if (!isOwnMessage) return null;
    
    return {
      status,
      icon: status === 'read' ? 'read' : status === 'delivered' ? 'delivered' : 'sent',
      color: status === 'read' ? '#53bdeb' : '#8696a0' // WhatsApp blue for read
    };
  }, [getMessageStatus]);

  /**
   * Fetch read receipts for messages in a chat
   */
  const fetchReadReceipts = useCallback(async (chatId, messageIds) => {
    if (!chatId) return [];

    try {
      const params = messageIds ? `?messageIds=${messageIds.join(',')}` : '';
      const response = await fetch(`${API_URL}/api/chat/${chatId}/read-receipts${params}`);
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        const newStatuses = {};
        data.readReceipts.forEach(receipt => {
          newStatuses[receipt.messageId] = {
            status: receipt.readBy.length > 0 ? 'read' : 
                    receipt.deliveredTo.length > 0 ? 'delivered' : 'sent',
            readBy: receipt.readBy,
            deliveredTo: receipt.deliveredTo
          };
        });
        
        setMessageStatuses(prev => ({ ...prev, ...newStatuses }));
        return data.readReceipts;
      }
    } catch (error) {
      console.error('Fetch read receipts error:', error);
    }
    
    return [];
  }, []);

  return {
    // Actions
    markMessageAsRead,
    markAllAsRead,
    markMessagesAsDelivered,
    fetchReadReceipts,
    
    // Queries
    getMessageStatus,
    isReadByAll,
    getReadReceiptDisplay,
    messageStatuses
  };
};

export default useReadReceipts;
