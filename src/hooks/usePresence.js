import { useState, useEffect, useCallback } from 'react';

/**
 * usePresence Hook - Online/Offline status and last seen tracking
 */

const getServerUrl = () => {
  // Check for VITE_SERVER_URL first (set in .env for remote deployment)
  const envUrl = import.meta.env.VITE_SERVER_URL;
  if (envUrl) return envUrl;
  // Fallback to VITE_API_URL or localhost
  return import.meta.env.VITE_API_URL || 'http://localhost:3009';
};

const API_URL = getServerUrl();

export const usePresence = (socket, user) => {
  const [onlineUsers, setOnlineUsers] = useState(new Map()); // userId -> { isOnline, lastSeen }
  const [lastSeenMap, setLastSeenMap] = useState(new Map());

  // Listen for presence events
  useEffect(() => {
    if (!socket) return;

    const handleUserStatusChange = (data) => {
      // Handle both single user object and array of users
      const users = Array.isArray(data) ? data : [data];
      
      users.forEach(user => {
        setOnlineUsers(prev => new Map(prev.set(user.userId || user._id, {
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          name: user.name,
          pic: user.pic
        })));
      });
    };

    const handleOnlineUsers = (users) => {
      const newMap = new Map();
      users.forEach(u => {
        newMap.set(u.userId || u._id, {
          isOnline: true,
          lastSeen: u.lastSeen,
          name: u.name,
          pic: u.pic
        });
      });
      setOnlineUsers(newMap);
    };

    socket.on('user_status_change', handleUserStatusChange);
    socket.on('online_users', handleOnlineUsers);

    return () => {
      socket.off('user_status_change', handleUserStatusChange);
      socket.off('online_users', handleOnlineUsers);
    };
  }, [socket]);

  /**
   * Check if a specific user is online
   */
  const isOnline = useCallback((userId) => {
    return onlineUsers.get(userId)?.isOnline || false;
  }, [onlineUsers]);

  /**
   * Get user's last seen timestamp
   */
  const getLastSeen = useCallback((userId) => {
    return onlineUsers.get(userId)?.lastSeen || null;
  }, [onlineUsers]);

  /**
   * Get formatted last seen text (e.g., "2m ago", "online")
   */
  const getLastSeenText = useCallback((userId) => {
    const userData = onlineUsers.get(userId);
    
    if (!userData) return 'Offline';
    if (userData.isOnline) return 'Online';
    
    const lastSeen = userData.lastSeen;
    if (!lastSeen) return 'Offline';
    
    return formatLastSeen(new Date(lastSeen));
  }, [onlineUsers]);

  /**
   * Fetch user's online status from API
   */
  const fetchUserStatus = useCallback(async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/chat/user/${userId}/online-status`);
      const data = await response.json();
      
      if (data.success) {
        setOnlineUsers(prev => new Map(prev.set(userId, {
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
          name: data.name,
          pic: data.pic
        })));
        return data;
      }
    } catch (error) {
      console.error('Fetch user status error:', error);
    }
    return null;
  }, []);

  /**
   * Get list of all online user IDs
   */
  const getOnlineUserIds = useCallback(() => {
    const onlineIds = [];
    for (const [userId, data] of onlineUsers.entries()) {
      if (data.isOnline) {
        onlineIds.push(userId);
      }
    }
    return onlineIds;
  }, [onlineUsers]);

  return {
    // State
    onlineUsers,
    
    // Queries
    isOnline,
    getLastSeen,
    getLastSeenText,
    getOnlineUserIds,
    
    // Actions
    fetchUserStatus
  };
};

/**
 * Format last seen timestamp to human-readable text
 */
export const formatLastSeen = (date) => {
  if (!date) return 'Offline';
  
  const now = new Date();
  const lastSeen = new Date(date);
  const diffMs = now - lastSeen;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 30) return 'Just now';
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  
  return lastSeen.toLocaleDateString();
};

export default usePresence;
