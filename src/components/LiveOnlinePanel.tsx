import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Wifi, 
  WifiOff,
  Circle,
  ChevronRight,
  UserPlus,
  Check,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { User } from '../types';

interface OnlineUser {
  userId: string;
  name: string;
  pic?: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface LiveOnlinePanelProps {
  socket: any;
  currentUser: User | null;
  isDarkMode: boolean;
  onStartChat?: (user: OnlineUser) => void;
}

const LiveOnlinePanel: React.FC<LiveOnlinePanelProps> = ({ 
  socket, 
  currentUser, 
  isDarkMode,
  onStartChat
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  // Load friends list
  const loadFriends = useCallback(async () => {
    if (!currentUser?._id) return;
    try {
      const res = await fetch(`/api/friends/${currentUser._id}`);
      if (res.ok) {
        const friendsData = await res.json();
        setFriends(new Set(friendsData.map((f: any) => f._id.toString())));
      }
    } catch (e) {
      console.error('Error loading friends:', e);
    }
  }, [currentUser?._id]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Listen for online users updates
  useEffect(() => {
    if (!socket) return;

    const normalizeUser = (userData: any): OnlineUser => ({
      userId: userData.userId || userData._id,
      name: userData.name || 'Unknown',
      pic: userData.pic,
      isOnline: userData.isOnline ?? true,
      lastSeen: userData.lastSeen
    });

    const handleOnlineUsers = (users: any[]) => {
      console.log('📥 LiveOnlinePanel received online_users:', users.length, users.map(u => u.name || u.userData?.name));
      // Normalize each user object so the UI can use userId consistently
      // Show ALL online users (not just friends) so users can see everyone online
      const normalized = users
        .map(userData => normalizeUser(userData))
        .filter(user => user.userId !== currentUser?._id);

      console.log('✅ LiveOnlinePanel normalized users:', normalized.length, normalized.map(u => u.name));
      setOnlineUsers(normalized);
      setTotalUsers(normalized.length);
    };

    const handleUserStatusChange = (data: any[]) => {
      console.log('📥 LiveOnlinePanel received user_status_change:', Array.isArray(data) ? data.length : 'single', Array.isArray(data) ? data.map((u: any) => u.name || u._id) : (data as any)?.name);
      // Server broadcasts full array of online users via io.emit
      if (Array.isArray(data)) {
        // Replace entire list with all online users from server
        const normalized = data
          .map(userData => normalizeUser(userData))
          .filter(user => user.userId !== currentUser?._id);
        console.log('✅ user_status_change - setting users:', normalized.length, normalized.map(u => u.name));
        setOnlineUsers(normalized);
        setTotalUsers(normalized.length);
      } else {
        // Single user update - merge with existing
        const normalizedUser = normalizeUser(data);
        if (normalizedUser.userId === currentUser?._id) return;
        
        setOnlineUsers(prev => {
          const existingIndex = prev.findIndex(u => u.userId === normalizedUser.userId);
          if (normalizedUser.isOnline) {
            if (existingIndex >= 0) {
              return prev.map((u, i) => i === existingIndex ? normalizedUser : u);
            } else {
              return [...prev, normalizedUser];
            }
          } else {
            if (existingIndex >= 0) {
              return prev.filter((_, i) => i !== existingIndex);
            }
          }
          return prev;
        });
      }
    };

    const handleConnected = (data: any) => {
      setIsConnected(true);
      if (data?.onlineUserCount) {
        setTotalUsers(data.onlineUserCount);
      }
    };

    const handleConnect = () => {
      setIsConnected(true);
      if (currentUser?._id) {
        socket.emit('setup', {
          _id: currentUser._id,
          name: currentUser.name,
          pic: currentUser.pic,
          email: currentUser.email
        });
      }
      // Request online users list
      socket.emit('get_online_users');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('online_users', handleOnlineUsers);
    socket.on('user_status_change', handleUserStatusChange);
    socket.on('connected', handleConnected);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('friend_request_accepted', () => {
      // Reload friends list when a friend request is accepted
      loadFriends();
    });

    // Set initial connection state
    setIsConnected(socket.connected);

    // Request online users if already connected
    if (socket.connected) {
      socket.emit('get_online_users');
    }

    // Auto-refresh online users every 10 seconds to keep list updated
    const refreshInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('get_online_users');
      }
    }, 10000);

    return () => {
      clearInterval(refreshInterval);
      socket.off('online_users', handleOnlineUsers);
      socket.off('user_status_change', handleUserStatusChange);
      socket.off('connected', handleConnected);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('friend_request_accepted');
    };
  }, [socket, currentUser?._id, loadFriends]);

  const handleUserClick = useCallback((user: OnlineUser) => {
    if (onStartChat) {
      onStartChat(user);
    }
    setIsExpanded(false);
  }, [onStartChat]);

  const handleSendFriendRequest = useCallback(async (e: React.MouseEvent, user: OnlineUser) => {
    e.stopPropagation();
    if (!currentUser?._id || !user?.userId) return;
    
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: currentUser._id, to: user.userId })
      });
      
      if (response.ok) {
        setSentRequests(prev => new Set(prev).add(user.userId));
        // Show success notification
        alert(`Friend request sent to ${user.name}!`);
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request');
    }
  }, [currentUser?._id]);

  // Format last seen time
  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return '';
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      isDarkMode 
        ? "bg-slate-900/80 border-slate-800" 
        : "bg-white border-slate-200"
    )}>
      {/* Header - Click to expand/collapse */}
      <button
        onClick={() => {
          const newExpanded = !isExpanded;
          setIsExpanded(newExpanded);
          // Refresh online users when expanding panel
          if (newExpanded && socket?.connected) {
            socket.emit('get_online_users');
          }
        }}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between transition-colors",
          isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl",
            isDarkMode ? "bg-slate-800" : "bg-slate-100"
          )}>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-left">
            <h2 className={cn(
              "font-semibold text-sm",
              isDarkMode ? "text-white" : "text-slate-800"
            )}>
              Live Users
            </h2>
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <>
                  <Wifi className="w-2.5 h-2.5 text-green-500" />
                  <span className="text-[10px] text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-2.5 h-2.5 text-red-500" />
                  <span className="text-[10px] text-red-500">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (socket?.connected) {
                console.log('🔄 Manual refresh requested');
                socket.emit('get_online_users');
              }
            }}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isDarkMode 
                ? "hover:bg-slate-700 text-slate-400" 
                : "hover:bg-slate-200 text-slate-500"
            )}
            title="Refresh online users"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <span className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            isDarkMode 
              ? "bg-green-500/20 text-green-400" 
              : "bg-green-100 text-green-700"
          )}>
            <Circle className="w-1.5 h-1.5 fill-current animate-pulse" />
            {onlineUsers.length}
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className={cn(
              "w-4 h-4",
              isDarkMode ? "text-slate-400" : "text-slate-500"
            )} />
          </motion.div>
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Divider */}
            <div className={cn(
              "border-t",
              isDarkMode ? "border-slate-800" : "border-slate-200"
            )} />

            {/* Current User Info */}
            <div className={cn(
              "px-4 py-3 flex items-center gap-3",
              isDarkMode ? "bg-slate-800/50" : "bg-slate-50"
            )}>
              <div className="relative">
                <img
                  src={currentUser?.pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"}
                  alt={currentUser?.name || 'You'}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2",
                  isDarkMode ? "border-slate-900" : "border-white",
                  "bg-green-500"
                )}>
                  <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-semibold text-xs truncate",
                  isDarkMode ? "text-white" : "text-slate-800"
                )}>
                  {currentUser?.name || 'You'}
                </p>
                <p className={cn(
                  "text-[10px]",
                  isDarkMode ? "text-green-400" : "text-green-600"
                )}>
                  Online • {onlineUsers.length} users • Socket: {socket?.id ? '✓' : '✗'}
                </p>
              </div>
            </div>


            {/* User List */}
            <div className={cn(
              "max-h-48 overflow-y-auto",
              isDarkMode ? "bg-slate-900/50" : "bg-slate-50/50"
            )}>
              {onlineUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                  <Users className={cn(
                    "w-6 h-6 mb-2",
                    isDarkMode ? "text-slate-600" : "text-slate-400"
                  )} />
                  <p className={cn(
                    "text-xs",
                    isDarkMode ? "text-slate-500" : "text-slate-500"
                  )}>
                    No users online
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                    <AnimatePresence mode="popLayout">
                      {onlineUsers.map((user) => (
                      <motion.div
                        key={user.userId}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => handleUserClick(user)}
                        className={cn(
                          "group flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all duration-200",
                          isDarkMode 
                            ? "hover:bg-slate-800" 
                            : "hover:bg-slate-100"
                        )}
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={user.pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          {/* Online indicator */}
                          <span className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2",
                            isDarkMode ? "border-slate-900" : "border-white",
                            "bg-green-500"
                          )}>
                            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                          </span>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-xs truncate",
                            isDarkMode ? "text-white" : "text-slate-800"
                          )}>
                            {user.name}
                          </p>
                          <p className={cn(
                            "text-[10px]",
                            isDarkMode ? "text-green-400" : "text-green-600"
                          )}>
                            Active now
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!friends.has(user.userId) && !sentRequests.has(user.userId) ? (
                            <button
                              onClick={(e) => handleSendFriendRequest(e, user)}
                              className={cn(
                                "p-1 rounded-lg transition-colors",
                                isDarkMode 
                                  ? "hover:bg-slate-700 text-slate-400 hover:text-blue-400" 
                                  : "hover:bg-slate-200 text-slate-500 hover:text-blue-500"
                              )}
                              title="Send friend request"
                            >
                              <UserPlus className="w-3 h-3" />
                            </button>
                          ) : friends.has(user.userId) ? (
                            <span className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
                              isDarkMode 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-green-100 text-green-600"
                            )}>
                              <Check className="w-2.5 h-2.5" />
                              Friend
                            </span>
                          ) : (
                            <span className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
                              isDarkMode 
                                ? "bg-yellow-500/20 text-yellow-400" 
                                : "bg-yellow-100 text-yellow-600"
                            )}>
                              Pending
                            </span>
                          )}
                        </div>
                        </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveOnlinePanel;
