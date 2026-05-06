import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { 
  Search, 
  X, 
  Send, 
  Users, 
  User, 
  Check,
  ChevronRight,
  Forward,
  MessageSquare,
  ImageIcon,
  FileText,
  Video,
  Mic
} from 'lucide-react';
import AnimatedAvatar from './AnimatedAvatar';
import type { User as UserType, Message } from '../types';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  currentUser: UserType | null;
  friends: UserType[];
  groups: any[];
  onForward: (selectedUsers: string[], selectedGroups: string[], message: Message) => void;
  isDarkMode?: boolean;
  onlineUsers?: UserType[];
}

const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  currentUser,
  friends,
  groups,
  onForward,
  isDarkMode = false,
  onlineUsers = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [isForwarding, setIsForwarding] = useState(false);

  // Reset selections when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([]);
      setSelectedGroups([]);
      setSearchQuery('');
      setActiveTab('users');
    }
  }, [isOpen]);

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleForward = async () => {
    if (selectedUsers.length === 0 && selectedGroups.length === 0) return;
    
    setIsForwarding(true);
    try {
      await onForward(selectedUsers, selectedGroups, message!);
      onClose();
    } catch (error) {
      console.error('Error forwarding message:', error);
    } finally {
      setIsForwarding(false);
    }
  };

  const getMessageTypeIcon = () => {
    if (message?.image) return <ImageIcon className="w-4 h-4" />;
    if (message?.video) return <Video className="w-4 h-4" />;
    if (message?.audio) return <Mic className="w-4 h-4" />;
    if (message?.reelData) return <MessageSquare className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  const getMessagePreview = () => {
    if (!message) return '';
    
    if (message.text) {
      return message.text.length > 50 ? message.text.substring(0, 50) + '...' : message.text;
    }
    
    if (message.image) return 'Photo';
    if (message.video) return 'Video';
    if (message.audio) return 'Audio Message';
    if (message.reelData) return `Reel: ${message.reelData.caption || 'Shared Reel'}`;
    
    return 'Media Message';
  };

  if (!isOpen || !message) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={cn(
            "w-full max-w-md rounded-2xl shadow-2xl overflow-hidden",
            isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn(
            "p-4 border-b flex items-center justify-between",
            isDarkMode ? "border-slate-700" : "border-slate-200"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"
              )}>
                <Forward className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Forward Message</h3>
                <p className="text-sm text-slate-500">Choose recipients</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-600"
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message Preview */}
          <div className={cn(
            "p-4 border-b",
            isDarkMode ? "border-slate-700" : "border-slate-200"
          )}>
            <div className={cn(
              "p-3 rounded-xl",
              isDarkMode ? "bg-slate-800" : "bg-slate-50"
            )}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"
                )}>
                  {getMessageTypeIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-500">From:</span>
                    <span className="text-sm font-medium">{message.user}</span>
                    {message.isForwarded && (
                      <span className="text-xs text-emerald-500">· Forwarded</span>
                    )}
                  </div>
                  <p className="text-sm break-words">{getMessagePreview()}</p>
                  {message.image && (
                    <img 
                      src={message.image} 
                      alt="Preview" 
                      className="mt-2 rounded-lg max-h-32 w-auto object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl",
              isDarkMode ? "bg-slate-800" : "bg-slate-100"
            )}>
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users or groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "flex-1 bg-transparent outline-none text-sm",
                  isDarkMode ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                )}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4">
            <div className="flex gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                onClick={() => setActiveTab('users')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                  activeTab === 'users' 
                    ? "bg-emerald-500 text-white" 
                    : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <User className="w-4 h-4" />
                Users
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                  activeTab === 'groups' 
                    ? "bg-emerald-500 text-white" 
                    : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Users className="w-4 h-4" />
                Groups
              </button>
            </div>
          </div>

          {/* Recipients List */}
          <div className="flex-1 overflow-y-auto p-4 max-h-64">
            {activeTab === 'users' ? (
              <div className="space-y-2">
                {filteredFriends.length > 0 ? (
                  filteredFriends.map(friend => {
                    const isFriendOnline = onlineUsers.some(u => u._id === friend._id);
                    return (
                      <motion.button
                        key={friend._id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleUserToggle(friend._id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                          selectedUsers.includes(friend._id)
                            ? isDarkMode ? "bg-emerald-500/20 border border-emerald-500/50" : "bg-emerald-50 border border-emerald-200"
                            : isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"
                        )}
                      >
                        <div className="relative">
                          <AnimatedAvatar username={friend.name} size={40} />
                          {isFriendOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className={cn(
                            "font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {friend.name}
                          </p>
                          <p className={cn("text-sm", isFriendOnline ? "text-emerald-500" : "text-slate-500")}>
                            {isFriendOnline ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      {selectedUsers.includes(friend._id) && (
                        <div className={cn(
                          "p-1 rounded-full",
                          isDarkMode ? "bg-emerald-500 text-white" : "bg-emerald-500 text-white"
                        )}>
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </motion.button>
                  );
                })
                ) : (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                      {searchQuery ? 'No users found' : 'No friends available'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map(group => (
                    <motion.button
                      key={group._id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGroupToggle(group._id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                        selectedGroups.includes(group._id)
                          ? isDarkMode ? "bg-emerald-500/20 border border-emerald-500/50" : "bg-emerald-50 border border-emerald-200"
                          : isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"
                      )}
                    >
                      <div className="relative">
                        <img 
                          src={group.pic} 
                          alt={group.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                          <Users className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 text-left">
                        <p className={cn(
                          "font-medium",
                          isDarkMode ? "text-white" : "text-slate-900"
                        )}>
                          {group.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {group.members?.length || 0} members
                        </p>
                      </div>
                      {selectedGroups.includes(group._id) && (
                        <div className={cn(
                          "p-1 rounded-full",
                          isDarkMode ? "bg-emerald-500 text-white" : "bg-emerald-500 text-white"
                        )}>
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </motion.button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                      {searchQuery ? 'No groups found' : 'No groups available'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={cn(
            "p-4 border-t flex items-center justify-between",
            isDarkMode ? "border-slate-700" : "border-slate-200"
          )}>
            <div className="text-sm text-slate-500">
              {selectedUsers.length + selectedGroups.length} selected
            </div>
            <button
              onClick={handleForward}
              disabled={selectedUsers.length === 0 && selectedGroups.length === 0 || isForwarding}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all",
                selectedUsers.length === 0 && selectedGroups.length === 0 || isForwarding
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-500 text-white hover:bg-emerald-600"
              )}
            >
              {isForwarding ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Forward
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ForwardMessageModal;
