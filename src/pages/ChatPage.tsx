import React, { useState, useEffect, useRef, useMemo, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import AnimatedAvatar from '../components/AnimatedAvatar';
import {
  Send,
  Info,
  Menu,
  Mic,
  Share2,
  MicOff,
  Search,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
  Circle,
  MoreVertical,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Star,
  Trash2,
  ExternalLink,
  User,
  UserCheck,
  Users,
  Video,
  Volume2,
  X,
  Zap,
  AlertTriangle,
  PhoneIncoming,
  PhoneOff,
  ChevronLeft,
  ChevronRight,
  VideoOff,
  FileText,
  MessageSquare,
  Ghost,
  UserMinus,
  Activity,
  Fingerprint,
  ImageIcon,
  Layers,
  Loader2,
  Play,
  Plus,
  Code,
  Database,
  Palette,
  Bot,
  Bell,
  Camera,
  ChevronDown,
  Globe,
  Languages,
  LogOut,
  Moon,
  Phone,
  Globe2,
  Sun,
  Upload,
  ChevronUp,
  Clock,
  Forward,
  Calendar,
  MessageCircle,
  Copy
} from 'lucide-react';
import type { User as UserType, Message, FriendRequest, Group, Story, Reel } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import { io, Socket } from 'socket.io-client';
import FloatingParticles from '../components/FloatingParticles';
import  Navbar  from '../components/Navbar';
import ForwardMessageModal from '../components/ForwardMessageModal';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { secureGet, securePost } from '../utils/secureApi';
import { useCallTranslator, SUPPORTED_LANGUAGES, Subtitle } from '../hooks/useCallTranslator';
import ReelPreviewCard from '../components/ReelPreviewCard';
import WatchTogether from '../components/WatchTogether';
import AISuggestions from '../components/AISuggestions';
import VerifiedBadge from '../components/VerifiedBadge';
import UserProfileModal from '../components/UserProfileModal';
import LiveOnlinePanel from '../components/LiveOnlinePanel';

// Component to track story views
const StoryViewTracker = ({ storyId, setViewedStories }: { storyId: string; setViewedStories: React.Dispatch<React.SetStateAction<Set<string>>> }) => {
  useEffect(() => {
    setViewedStories(prev => new Set(prev).add(storyId));
  }, [storyId, setViewedStories]);
  return null;
};

interface ChatPageProps {
  isDarkMode?: boolean;
  user?: UserType | null;
  socket?: any;
  socketConnected?: boolean;
}

const sidebarItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 }
};

const messageVariants = {
  initial: { opacity: 0, scale: 0.9, y: 10 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: 'spring', damping: 20, stiffness: 300 }
  }
};

const TEAM_MEMBERS = [
  { name: "Rashmi", role: "Project Lead & Frontend Architect", image: "/team/rashmi.jpeg", icon: User },
  { name: "Shreya", role: "Backend Engineer & Database Admin", image: "/team/shreya.jpeg", icon: Database },
  { name: "Nitin", role: "UI/UX Designer & Motion Specialist", image: "/team/nitin.jpeg", icon: Palette },
  { name: "Sneha", role: "AI Integration & Security Specialist", image: "/team/sneha.jpeg?v=2", icon: Shield },
];
const INTELLICALL_ABOUT = {
  headline: "The Future of Real-Time Communication",
  tagline: "Connect. Collaborate. Communicate.",
  description:
    "IntelliCall is a next-generation communication platform that seamlessly integrates live chat, AI-powered assistance, group conversations, stories, reels, and high-quality voice/video calls. Built with cutting-edge WebRTC technology and WebSocket real-time messaging, IntelliCall delivers instant synchronization and crystal-clear communication experiences.",
  mission: "Our mission is to break down communication barriers and bring people closer through innovative technology.",
  vision: "To become the world's most intuitive and feature-rich communication platform."
};

const ChatPage = ({ user, setUser, isDarkMode, toggleDarkMode, socket: propSocket, socketConnected: parentSocketConnected }: ChatPageProps & {
  setUser: (u: UserType | null) => void; 
  toggleDarkMode?: () => void
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Use propSocket directly from parent - no local state to avoid sync issues
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<UserType[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [messageInfo, setMessageInfo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupDPUpload, setGroupDPUpload] = useState<File | null>(null);
  const [isUploadingGroupDP, setIsUploadingGroupDP] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = useState<FriendRequest[]>([]);
  const [cancelledRequests, setCancelledRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<UserType[]>([]);
  const [searchFriendInput, setSearchFriendInput] = useState('');
  const [isSearchingFriend, setIsSearchingFriend] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryOption, setSummaryOption] = useState<'today' | 'yesterday' | 'entire' | 'custom' | 'unread'>('today'); // Default to today's messages
  const [showSummaryOptions, setShowSummaryOptions] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [messageMenu, setMessageMenu] = useState<{ show: boolean; messageId: string | null; x: number; y: number }>({ show: false, messageId: null, x: 0, y: 0 });
  const [customDate, setCustomDate] = useState<string>(''); // For custom date option
  const [scheduledSendTime, setScheduledSendTime] = useState<string>('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<Message[]>([]);
  // Recurring message states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [recurringDays, setRecurringDays] = useState<number[]>([]); // 0 = Sunday, 1 = Monday, etc.
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  // AI Tools Modal state
  const [showAiToolsModal, setShowAiToolsModal] = useState(false);
  const [selectedMessageForAi, setSelectedMessageForAi] = useState<Message | null>(null);
  const [aiToolActiveTab, setAiToolActiveTab] = useState<'explain' | 'translate'>('explain');
  const [aiToolResult, setAiToolResult] = useState<string>('');
  const [aiToolLoading, setAiToolLoading] = useState(false);
  const [msgTranslateTargetLang, setMsgTranslateTargetLang] = useState<string>('hi'); // Default Hindi
  const [isOutgoingTranslationEnabled, setIsOutgoingTranslationEnabled] = useState(false);
  const [outgoingTargetLang, setOutgoingTargetLang] = useState<string>('en'); // Default English for outgoing
  const [isTranslatingOutgoing, setIsTranslatingOutgoing] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  // Translation preview states
  const [originalInputText, setOriginalInputText] = useState<string>('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  // Use parent socket connection status directly
  const isSocketConnected = parentSocketConnected || false;
  
  // Debug socket connection status
  useEffect(() => {
    console.log('🔌 ChatPage: Socket connection status:', {
      parentSocketConnected,
      isSocketConnected,
      socket: propSocket ? 'exists' : 'null',
      socketConnected: propSocket?.connected
    });
  }, [parentSocketConnected, isSocketConnected, propSocket?.connected]);
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ from: string, fromUserId?: string, type: 'video' | 'audio', offer: any, timestamp?: number, missedCallAdded?: boolean } | null>(null);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [missedCalls, setMissedCalls] = useState<{ from: string, type: 'video' | 'audio', timestamp: number }[]>([]);
  const [outgoingCalls, setOutgoingCalls] = useState<{ to: string, type: 'video' | 'audio', timestamp: number, duration?: number }[]>([]);
  const [receivedCalls, setReceivedCalls] = useState<{ from: string, type: 'video' | 'audio', timestamp: number, duration?: number }[]>([]);
  
  // Reel viewer state for shared reels
  const [viewingReel, setViewingReel] = useState<Reel | null>(null);

  // Handle shared reel from navigation state (when coming from ReelsPage)
  useEffect(() => {
    const state = location.state as { sharedReel?: Reel; fromUser?: UserType } | null;
    if (state?.sharedReel) {
      // Store the shared reel info for later use
      const sharedReelData = state.sharedReel;
      const fromUserData = state.fromUser;

      // Clear location state to prevent re-processing
      navigate(location.pathname, { replace: true });

      // Show notification about shared reel
      showBrowserNotification(
        '🎬 Shared Reel Ready',
        `You have a reel to share with friends!`,
        'info'
      );

      // Store in session for the share modal
      sessionStorage.setItem('pendingSharedReel', JSON.stringify({
        reel: sharedReelData,
        from: fromUserData?.name || 'Guest User'
      }));
    }
  }, [location.state, location.pathname, navigate]);

  // Watch Together feature states
  const [watchTogetherReel, setWatchTogetherReel] = useState<Reel | null>(null);
  const [isWatchTogetherOpen, setIsWatchTogetherOpen] = useState(false);
  const [watchTogetherParticipants, setWatchTogetherParticipants] = useState<UserType[]>([]);
  
  // AI Suggestions modal
  const [isAISuggestionsOpen, setIsAISuggestionsOpen] = useState(false);
  
  // Repost to Story modal
  const [repostReel, setRepostReel] = useState<Reel | null>(null);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostCaption, setRepostCaption] = useState('');

  // User Profile Modal state
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserType | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Unread message counts for notifications
  const [unreadMessageCounts, setUnreadMessageCounts] = useState<Map<string, number>>(new Map()); // userId or groupId -> count

  // Timer refs for auto call end
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const incomingCallTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track recent incoming calls to prevent duplicates
  const recentIncomingCallsRef = useRef<Set<string>>(new Set());
  
  // Track recent missed calls to prevent duplicates (using Map to track timestamps)
  const recentMissedCallsRef = useRef<Map<string, number>>(new Map());

  // Track if call was already ended to prevent duplicate call_missed emissions
  const callEndedRef = useRef<boolean>(false);

  // Track if call was rejected/not-answered by other party (prevents caller from emitting call_missed)
  const callRejectedByOtherRef = useRef<boolean>(false);

  // Refs to prevent stale closures in socket listeners
  const userRef = useRef(user);
  const onlineUsersRef = useRef(onlineUsers);

  // Track if call_missed was already emitted for this call (prevents duplicates from both sides)
  const callMissedEmittedRef = useRef<boolean>(false);

  // Track current call ID for deduplication
  const currentCallIdRef = useRef<string | null>(null);

  // Track active browser notifications so we can close them when chat is opened
  const activeNotificationsRef = useRef<Map<string, Notification>>(new Map());

  // Helper function to add unique missed call - STRONG DEDUPLICATION
  const addUniqueMissedCall = useCallback((from: string, type: 'video' | 'audio', timestamp: number) => {
    // Use a 5-minute window for deduplication (more lenient to catch all duplicates)
    const callKey = `${from}-${type}-${Math.floor(timestamp / 300000)}`; // Group by 5-minute window
    
    setMissedCalls(prev => {
      // Check if call already exists from same user with same type in last 5 minutes
      const fiveMinutesAgo = Date.now() - 300000; // 5 minutes window
      const recentCallFromSameUser = prev.find(call => 
        call.from === from && 
        call.type === type && 
        call.timestamp > fiveMinutesAgo
      );
      
      // Also check our tracking set with time-based cleanup
      const existingTimestamp = recentMissedCallsRef.current.get(callKey);
      const fiveMinutesAgoForRef = Date.now() - 300000;
      
      if (recentCallFromSameUser || (existingTimestamp && existingTimestamp > fiveMinutesAgoForRef)) {
        console.log("⚠️ Duplicate missed call prevented:", from, type, timestamp);
        return prev;
      }
      
      // Add to tracking set with current timestamp
      recentMissedCallsRef.current.set(callKey, Date.now());
      
      // Cleanup old entries from tracking set (keep only last 10 minutes)
      const cleanupCutoff = Date.now() - 600000;
      for (const [key, time] of recentMissedCallsRef.current.entries()) {
        if (time < cleanupCutoff) {
          recentMissedCallsRef.current.delete(key);
        }
      }
      
      console.log("✅ Adding missed call:", from, type, new Date(timestamp).toLocaleTimeString());
      return [...prev, { from, type, timestamp }];
    });
  }, []);
  const [showProfile, setShowProfile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showChat, setShowChat] = useState(false); // For mobile view
  const [profilePic, setProfilePic] = useState<string | null>(user?.pic || null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'blind'>('all');
  const [activeFeed, setActiveFeed] = useState<'chat' | 'reels'>('chat');
  const [reels, setReels] = useState<Reel[]>([]);
  const [newReelCaption, setNewReelCaption] = useState('');
  const [newReelMediaUrl, setNewReelMediaUrl] = useState('');
  const [newReelMediaType, setNewReelMediaType] = useState<'image' | 'video'>('video');
  const [editReelId, setEditReelId] = useState<string | null>(null);
  const [editReelCaption, setEditReelCaption] = useState('');
  const [editReelMediaUrl, setEditReelMediaUrl] = useState('');
  const [editReelMediaType, setEditReelMediaType] = useState<'image' | 'video'>('video');
  const [activeCommentReel, setActiveCommentReel] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [messageReactions, setMessageReactions] = useState<Map<string, Map<string, number>>>(new Map());
  const [appNotifications, setAppNotifications] = useState<Array<{id: string, message: string, type: 'info' | 'success' | 'error' | 'warning'}>>([]);
  
  // ===== NEW MODERN FEATURES =====
  // Pinned/Favorite chats
  const [pinnedChats, setPinnedChats] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('pinnedChats');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  // Chat search within conversation
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  
  // Media preview before send
  const [mediaPreview, setMediaPreview] = useState<{type: 'image' | 'video' | 'file', url: string, file?: File} | null>(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  
  // Voice recording for voice messages
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceRecordingTime, setVoiceRecordingTime] = useState(0);
  const [voiceMessageBlob, setVoiceMessageBlob] = useState<Blob | null>(null);
  const [showVoiceMessagePreview, setShowVoiceMessagePreview] = useState(false);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceRecordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Last message preview for sidebar
  const [lastMessages, setLastMessages] = useState<Map<string, {text: string, timestamp: string, isMe: boolean}>>(new Map());
 
  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  // Function to calculate unread messages for each user and group
  const calculateUnreadMessages = useCallback(() => {
    const unreadCounts = new Map<string, number>();
    
    messages.forEach(message => {
      // Skip messages sent by current user
      if (message.senderId === user?._id) return;
      
      // Skip system messages or deleted messages
      if (message.isSystem || message.isDeleted) return;
      
      let chatId: string | null = null;
      
      // Determine which chat this message belongs to
      if (message.isAI) {
        // AI Assistant messages
        chatId = 'ai';
      } else if (message.isBlind) {
        // Blind Chat messages
        chatId = 'blind';
      } else if (message.groupId) {
        // Group message
        chatId = `group_${message.groupId}`;
      } else if (message.to === user?._id || (!message.to && !message.groupId && !message.isAI && !message.isBlind)) {
        // Direct message to current user or global message
        chatId = `user_${message.senderId}`;
      }
      
      // Count as unread if not read by current user
      if (chatId && message.senderId !== user?._id && !message.readBy?.includes(user?._id)) {
        unreadCounts.set(chatId, (unreadCounts.get(chatId) || 0) + 1);
      }
    });
    
    setUnreadMessageCounts(unreadCounts);
  }, [messages, user?._id]);

  const fetchScheduledMessages = useCallback(async () => {
    if (!user || (!selectedUser && !selectedGroup)) {
      return;
    }

    try {
      const isGroup = selectedGroup ? 'true' : 'false';
      const chatId = selectedGroup ? selectedGroup._id : selectedUser?._id;
      const res = await fetch(`/api/message/scheduled/${chatId}?userId=${user._id}&isGroup=${isGroup}`);
      if (!res.ok) {
        console.warn('Unable to fetch scheduled messages', res.statusText);
        return;
      }
      const data = await res.json();
      // Messages are fetched but not stored separately; they get loaded with batch fetch
    } catch (error) {
      console.error('Fetch scheduled messages error:', error);
    }
  }, [selectedGroup, selectedUser, user]);

  // calculateUnreadMessages is already called by the useCallback above, no need for separate useEffect

  // Function to mark messages as read when opening a chat
  const markMessagesAsRead = useCallback((chatType: 'user' | 'group' | 'ai' | 'blind' | 'global', chatId?: string) => {
    setMessages(prev => {
      const updatedMessages = prev.map(message => {
        // Mark relevant messages as read
        if (chatType === 'group' && message.groupId === chatId) {
          if (message.senderId !== user?._id && !message.read && !message.readBy?.includes(user?._id)) {
            // Emit read receipt
            propSocket?.emit('mark_message_read', { messageId: message.id, userId: user?._id });
            return { ...message, read: true, readAt: new Date().toISOString(), readBy: [...(message.readBy || []), user?._id] };
          }
        } else if (chatType === 'user' && message.senderId === chatId) {
          if (!message.read && !message.readBy?.includes(user?._id)) {
            // Emit read receipt
            propSocket?.emit('mark_message_read', { messageId: message.id, userId: user?._id });
            return { ...message, read: true, readAt: new Date().toISOString(), readBy: [...(message.readBy || []), user?._id] };
          }
        } else if (chatType === 'global' && !message.to && !message.groupId && !message.isAI && !message.isBlind) {
          if (!message.read && !message.readBy?.includes(user?._id)) {
            return { ...message, read: true, readAt: new Date().toISOString(), readBy: [...(message.readBy || []), user?._id] };
          }
        } else if (chatType === 'ai' && message.isAI) {
          if (!message.read && !message.readBy?.includes(user?._id)) {
            return { ...message, read: true, readAt: new Date().toISOString(), readBy: [...(message.readBy || []), user?._id] };
          }
        } else if (chatType === 'blind' && message.isBlind) {
          if (!message.read && !message.readBy?.includes(user?._id)) {
            return { ...message, read: true, readAt: new Date().toISOString(), readBy: [...(message.readBy || []), user?._id] };
          }
        }
        return message;
      });
      
      // Also immediately update unread counts for the specific chat
      const chatKey = chatType === 'ai' ? 'ai' : 
                     chatType === 'blind' ? 'blind' : 
                     chatType === 'global' ? 'global' :
                     `${chatType}_${chatId}`;
      setUnreadMessageCounts(prev => {
        const newCounts = new Map(prev);
        newCounts.set(chatKey, 0);
        return newCounts;
      });
      
      // Close any active browser notification for this chat
      const activeNotification = activeNotificationsRef.current.get(chatKey);
      if (activeNotification) {
        activeNotification.close();
        activeNotificationsRef.current.delete(chatKey);
        console.log(`🔔 Closed notification for chat: ${chatKey}`);
      }
      
      return updatedMessages;
    });
  }, [propSocket, user?._id]);

  // Notification Badge Component
  const NotificationBadge = ({ count, isDarkMode }: { count: number; isDarkMode: boolean }) => {
    if (count <= 0) return null;
    
    return (
      <div className={cn(
        "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-black flex items-center justify-center animate-bounce border-2",
        isDarkMode 
          ? "bg-red-500 text-white border-slate-900" 
          : "bg-red-500 text-white border-white"
      )}>
        {count > 99 ? '99+' : count}
      </div>
    );
  };

  const handleDeleteGroup = async (groupId: string) => {
    setShowConfirmModal({
      show: true,
      title: "Delete Group",
      message: "Are you sure you want to delete this group? This will delete all messages for everyone and cannot be undone.",
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/groups/${groupId}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            setGroups(prev => prev.filter(g => g._id !== groupId));
            if (selectedGroup?._id === groupId) setSelectedGroup(null);
            setShowGroupInfo(false);
            setShowConfirmModal(prev => ({ ...prev, show: false }));
            // Track deleted group in localStorage
            const deletedGroups = JSON.parse(localStorage.getItem('deletedGroups') || '[]');
            if (!deletedGroups.includes(groupId)) {
              deletedGroups.push(groupId);
              localStorage.setItem('deletedGroups', JSON.stringify(deletedGroups));
            }
            alert("Group deleted successfully!");
          } else {
            // If API fails, still remove from local state
            setGroups(prev => prev.filter(g => g._id !== groupId));
            if (selectedGroup?._id === groupId) setSelectedGroup(null);
            setShowGroupInfo(false);
            setShowConfirmModal(prev => ({ ...prev, show: false }));
            // Track deleted group in localStorage
            const deletedGroups = JSON.parse(localStorage.getItem('deletedGroups') || '[]');
            if (!deletedGroups.includes(groupId)) {
              deletedGroups.push(groupId);
              localStorage.setItem('deletedGroups', JSON.stringify(deletedGroups));
            }
            alert("Group deleted from your chats. (API error occurred)");
          }
        } catch (error) {
          console.error("Error deleting group:", error);
          // Even if API fails, remove from local state
          setGroups(prev => prev.filter(g => g._id !== groupId));
          if (selectedGroup?._id === groupId) setSelectedGroup(null);
          setShowGroupInfo(false);
          setShowConfirmModal(prev => ({ ...prev, show: false }));
          // Track deleted group in localStorage
          const deletedGroups = JSON.parse(localStorage.getItem('deletedGroups') || '[]');
          if (!deletedGroups.includes(groupId)) {
            deletedGroups.push(groupId);
            localStorage.setItem('deletedGroups', JSON.stringify(deletedGroups));
          }
          alert("Group deleted from your chats. (Connection error)");
        }
      }
    });
  };

  const handleDeleteGroupForUser = async (groupId: string) => {
    setShowConfirmModal({
      show: true,
      title: "Delete Group",
      message: "Are you sure you want to delete this group from your chats? This will remove the group for you only.",
      type: 'warning',
      onConfirm: async () => {
        try {
          // Since you've already exited the group, just remove it from local state
          setGroups(prev => prev.filter(g => g._id !== groupId));
          if (selectedGroup?._id === groupId) setSelectedGroup(null);
          setShowGroupInfo(false);
          setShowConfirmModal(prev => ({ ...prev, show: false }));
          // Track deleted group in localStorage
          const deletedGroups = JSON.parse(localStorage.getItem('deletedGroups') || '[]');
          if (!deletedGroups.includes(groupId)) {
            deletedGroups.push(groupId);
            localStorage.setItem('deletedGroups', JSON.stringify(deletedGroups));
          }
          alert("Group deleted from your chats.");
          
          // Also try to call exit group API in case user is still a member
          try {
            await fetch(`/api/groups/${groupId}/members/${user._id}`, {
              method: 'DELETE'
            });
          } catch (exitError) {
            // Ignore exit error since we're primarily removing from local state
            console.log("Exit API call failed, but group removed locally");
          }
        } catch (error) {
          console.error("Error deleting group for user:", error);
        }
      }
    });
  };

  const handleDeletePerson = async (friendId: string) => {
    setShowConfirmModal({
      show: true,
      title: "Remove Friend",
      message: "Are you sure you want to remove this person and delete all messages? This action is permanent.",
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/friends/${user._id}/${friendId}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            setFriends(prev => {
              const updated = prev.filter(f => f._id !== friendId);
              localStorage.setItem('friends', JSON.stringify(updated));
              return updated;
            });
            if (selectedUser?._id === friendId) setSelectedUser(null);
            setShowConfirmModal(prev => ({ ...prev, show: false }));
          }
        } catch (error) {
          console.error("Error deleting person:", error);
        }
      }
    });
  };

  const addNotification = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setAppNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAppNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };
  const [isGhostMode, setIsGhostMode] = useState(() => {
    try {
      const saved = localStorage.getItem('ghostMode');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('ghostMode', JSON.stringify(isGhostMode));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [isGhostMode]);

  useEffect(() => {
    if (!user?.name) return;
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`missedCalls_${user.name}`, JSON.stringify(missedCalls));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [missedCalls, user?.name]);

  useEffect(() => {
    if (!user?.name) return;
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`outgoingCalls_${user.name}`, JSON.stringify(outgoingCalls));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [outgoingCalls, user?.name]);

  useEffect(() => {
    if (!user?.name) return;
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`receivedCalls_${user.name}`, JSON.stringify(receivedCalls));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [receivedCalls, user?.name]);

  // Load saved calls data when user becomes available
  useEffect(() => {
    if (user?.name) {
      try {
        const savedMissedCalls = localStorage.getItem(`missedCalls_${user.name}`);
        if (savedMissedCalls) {
          const parsedCalls = JSON.parse(savedMissedCalls);
          setMissedCalls(parsedCalls);
          
          // Also populate ref tracking to prevent duplicates after reload
          parsedCalls.forEach((call: { from: string, type: 'video' | 'audio', timestamp: number }) => {
            const callKey = `${call.from}-${call.type}-${Math.floor(call.timestamp / 300000)}`;
            recentMissedCallsRef.current.set(callKey, Date.now());
          });
        }

        const savedOutgoingCalls = localStorage.getItem(`outgoingCalls_${user.name}`);
        if (savedOutgoingCalls) {
          setOutgoingCalls(JSON.parse(savedOutgoingCalls));
        }

        const savedReceivedCalls = localStorage.getItem(`receivedCalls_${user.name}`);
        if (savedReceivedCalls) {
          setReceivedCalls(JSON.parse(savedReceivedCalls));
        }
      } catch (error) {
        console.error('Error loading saved calls:', error);
      }
    }
  }, [user?.name]);

  const [ghostTimer, setGhostTimer] = useState(60); // Default 60s (1 minute) self-destruct
  const [moodColor, setMoodColor] = useState('emerald');
  const [showAboutChat, setShowAboutChat] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [videoCallFilterId, setVideoCallFilterId] = useState('none');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [isCallRecording, setIsCallRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isCallTranslatorEnabled, setIsCallTranslatorEnabled] = useState(false);
  const [callTranslatorTargetLang, setCallTranslatorTargetLang] = useState('hi'); // Default Hindi
  const [callTranslatorSourceLang, setCallTranslatorSourceLang] = useState('auto');
  const [showCallTranslatorSettings, setShowCallTranslatorSettings] = useState(false);
  const [callSubtitles, setCallSubtitles] = useState<Subtitle[]>([]);
  const [verificationInput, setVerificationInput] = useState('');
  const [verifiedUsers, setVerifiedUsers] = useState<Set<string>>(new Set());
  const [suspiciousUsers, setSuspiciousUsers] = useState<Set<string>>(new Set());
  const [spamUsers, setSpamUsers] = useState<Set<string>>(new Set());
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isTranslating, setIsTranslating] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [conversationSummary, setConversationSummary] = useState('');
  const [stories, setStories] = useState<Story[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [viewedStories, setViewedStories] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('viewedStoriesChat');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Calculate new stories count (not by current user and not viewed)
  const newStoriesCount = stories.filter(story => 
    story.userName !== user?.name && !viewedStories.has(story.id)
  ).length;

  // Comment section state
  const [showCommentBox, setShowCommentBox] = useState<string | null>(null);
  const [storyComments, setStoryComments] = useState<{ [storyId: string]: any[] }>({});
  
  // Forward message state
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);

  const fetchStories = async () => {
    try {
      // Mock stories data - replace with actual API call
      const mockStories: Story[] = [
      {
          id: '1',
          userName: user?.name || 'Anonymous',
          userPic: user?.pic,
          mediaUrl: 'https://picsum.photos/seed/story1/400/600',
          mediaType: 'image',
          timestamp: new Date(Date.now() - 10000).toISOString(), // 10 seconds ago
          duration: 5000,
          viewed: false
        },
        {
          id: '2', 
          userName: 'Demo User',
          userPic: 'https://picsum.photos/seed/demo/200/200',
          mediaUrl: 'https://picsum.photos/seed/story2/400/600',
          mediaType: 'image',
          timestamp: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
          duration: 5000,
          viewed: false
        },
        {
          id: '3',
          userName: 'Another User',
          userPic: 'https://picsum.  photos/seed/user3/200/200',
          mediaUrl: 'https://picsum.photos/seed/story3/400/600',
          mediaType: 'image',
          timestamp: new Date(Date.now() - 2000).toISOString(), // 2 seconds ago
          duration: 5000,
          viewed: false
        }
      ];
      
      // Sort stories by timestamp (newest first)
      const sortedStories = mockStories.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setStories(sortedStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  // Delete story function
  const deleteStory = async (storyId: string) => {
    try {
      // Remove from local state
      setStories(prev => prev.filter(story => story.id !== storyId));
      
      // Add API call here to delete from server
      // await fetch(`/api/stories/${storyId}`, { method: 'DELETE' });
      
      console.log('Story deleted:', storyId);
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };

  // Fetch stories on component mount
  useEffect(() => {
    fetchStories();
  }, []);

  // Save viewed stories to localStorage with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('viewedStoriesChat', JSON.stringify([...viewedStories]));
    }, 500); // Debounce for 500ms
    
    return () => clearTimeout(timeoutId);
  }, [viewedStories]);

  // AI Suggestions function - Enhanced with Context
  const generateAiSuggestions = useCallback(async (currentMessage: string) => {
    if (!currentMessage.trim() || currentMessage.length < 3) {
      setAiSuggestions([]);
      return;
    }
    
    try {
      // Prepare context from recent messages
      const recentMessages = messages.slice(-5).map(msg => ({
        text: msg.text,
        user: msg.user,
        timestamp: msg.timestamp
      }));
      
      // Prepare context about current conversation
      const context = {
        currentMessage: currentMessage.trim(),
        recentMessages,
        conversationType: selectedGroup ? 'group' : selectedUser ? 'private' : 'ai',
        participantName: selectedGroup?.name || selectedUser?.name || 'AI Assistant',
        messageCount: messages.length
      };
      
      const response = await fetch('/api/ai/smart-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentMessage.trim(),
          context,
          maxSuggestions: 3
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const suggestions = data.replies?.slice(0, 3) || [];
        
        // Filter out duplicate or very similar suggestions
        const uniqueSuggestions = suggestions.filter((suggestion: string, index: number) => {
          return suggestions.findIndex((s: string) => 
            s.toLowerCase().trim() === suggestion.toLowerCase().trim()
          ) === index;
        });
        
        setAiSuggestions(uniqueSuggestions);
      }
    } catch (error) {
      console.error('AI suggestions error:', error);
      setAiSuggestions([]);
    }
  }, [messages, selectedGroup, selectedUser]);
  const [trendingReels, setTrendingReels] = useState<Reel[]>([]);
  const [moodTheme, setMoodTheme] = useState('emerald');
  const callMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const callAudioChunksRef = useRef<Blob[]>([]);

  const STICKERS = [
    "https://media.giphy.com/media/JIX9a2jYV2U4o/giphy.gif",
    "https://media.giphy.com/media/3o7TKMGpxS7S0T0V0s/giphy.gif",
    "https://media.giphy.com/media/l41lTfuxV5F6v6z6w/giphy.gif",
    "https://media.giphy.com/media/3o7TKVUn7iM8FMEU24/giphy.gif",
    "https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif",
    "https://media.giphy.com/media/26ybo8ByaPwmlTqxM/giphy.gif",
    "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
    "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
    "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
    "https://media.giphy.com/media/3o85xwsQfOwRkpDyWc/giphy.gif",
    "https://media.giphy.com/media/10GoGqdnBiZq9q/giphy.gif",
    "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif",
    "https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif",
    "https://media.giphy.com/media/3o6Zt6S0LbKz8m6I7W/giphy.gif",
    "https://media.giphy.com/media/3o7abKhOpu0NnHlQq8/giphy.gif",
    "https://media.giphy.com/media/3o6fJ1ZQX5Vb4p8cGQ/giphy.gif"
  ];

  const SEND_SOUND = "https://raw.githubusercontent.com/sharma-rashmi/assets/main/send.mp3";
  const RECEIVE_SOUND = "https://raw.githubusercontent.com/sharma-rashmi/assets/main/receive.mp3";
  const CALL_SOUND = "https://raw.githubusercontent.com/sharma-rashmi/assets/main/call.mp3";
  
  const VIDEO_CALL_FILTERS = [
    { id: 'none', label: 'None', css: 'none' },
    { id: 'blur', label: 'Blur', css: 'blur(4px)' },
    { id: 'grayscale', label: 'B&W', css: 'grayscale(100%)' },
    { id: 'sepia', label: 'Sepia', css: 'sepia(100%)' },
    { id: 'invert', label: 'Invert', css: 'invert(100%)' },
    { id: 'hue-rotate', label: 'Hue', css: 'hue-rotate(90deg)' }
  ];
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const remotePeerUserIdRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const selectedUserRef = useRef<UserType | null>(null);
  const selectedGroupRef = useRef<Group | null>(null);
  const activeTabRef = useRef<'all' | 'ai' | 'blind'>('all');

  // Refs to avoid stale closures in translator callback
  const propSocketRef = useRef(propSocket);
  useEffect(() => {
    propSocketRef.current = propSocket;
  }, [propSocket]);

  // Memoized subtitle callback to prevent speech recognition from restarting constantly
  const handleSubtitle = useCallback((subtitle: Subtitle) => {
    const currentSocket = propSocketRef.current;
    const currentPeerId = remotePeerUserIdRef.current;
    if (currentSocket && currentPeerId) {
      currentSocket.emit('call_subtitle', {
        toUserId: currentPeerId,
        subtitle
      });
      
      // Add translated subtitle to chat as a system message
      const subtitleMessage: Message = {
        _id: `subtitle_${subtitle.id}`,
        sender: { _id: user?._id || '', name: user?.name || '', pic: profilePic },
        to: selectedUser?.name,
        groupId: selectedGroup?._id,
        text: `🎤 ${subtitle.translatedText || subtitle.text}`,
        timestamp: new Date().toISOString(),
        profilePic: profilePic || undefined,
        isSystem: true,
        isTranslated: true,
        originalText: subtitle.text,
        translatedText: subtitle.translatedText,
        language: subtitle.language,
        id: '',
        user: ''
      };
      
      setMessages(prev => [...prev, subtitleMessage]);
      scrollToBottom();
    }
  }, [user?._id, user?.name, profilePic, selectedUser?.name, selectedGroup?._id]);

  // Call Translator Hook - pass localStream for audio processing during calls
  const { 
    subtitles, 
    isListening: isTranslatorListening, 
    isManualMode: isTranslatorManualMode,
    error: translatorError, 
    clearSubtitles, 
    addManualSubtitle,
    interimTranscript: translatorInterim 
  } = useCallTranslator({
    enabled: isCallTranslatorEnabled && (isCalling || incomingCall !== null),
    targetLanguage: callTranslatorTargetLang,
    sourceLanguage: callTranslatorSourceLang,
    onSubtitle: handleSubtitle,
    localStream: localStream // Pass the call's audio stream for speech recognition
  });

  // AI-Powered Functions
  const detectSpam = (message: string, userId: string): boolean => {
    const userMessages = messages.filter(m => m.user === userId);
    const recentMessages = userMessages.filter(m => 
      Date.now() - new Date(m.timestamp).getTime() < 60000 // Last 60 seconds
    );
    
    // Spam detection rules
    const hasTooManyMessages = recentMessages.length > 10;
    const hasDuplicateContent = recentMessages.filter(m => m.text === message).length > 2;
    const hasTooManyLinks = (message.match(/https?:\/\/[^\s]+/g) || []).length > 3;
    const hasSuspiciousKeywords = /free|click|win|prize|urgent|limited time/i.test(message);
    
    return hasTooManyMessages || hasDuplicateContent || hasTooManyLinks || hasSuspiciousKeywords;
  };

  const generateSmartReplies = async (message: string) => {
    try {
      const response = await fetch('/api/ai/smart-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context: messages.slice(-5) })
      });
      const data = await response.json();
      setSmartReplies(data.replies || []);
    } catch (error) {
      console.error('Smart replies error:', error);
    }
  };

  const generateConversationSummary = async () => {
    try {
      // Get last 20 messages and format as history string
      const recentMessages = messages.slice(-20).filter(m => !m.isSystem && m.text);
      const history = recentMessages
        .map(m => `${m.user}: ${m.text}`)
        .join('\n');

      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history })
      });
      const data = await response.json();
      setConversationSummary(data.text || '');
    } catch (error) {
      console.error('Summary error:', error);
    }
  };

  const recognitionRef = useRef<any>(null);
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');
  const voiceInputPrefixRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  const startVoiceInput = async () => {
    console.log('🎤 startVoiceInput called');
    voiceInputPrefixRef.current = inputMessage.trim();
    
    // Check browser support first
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    console.log('🎤 SpeechRecognition available:', !!SpeechRecognition);
    
    if (!SpeechRecognition) {
      showBrowserNotification('Voice input not supported', 'Please use Chrome, Edge, or Safari browser', 'warning');
      return;
    }

    // Web Speech API requires secure context (HTTPS) except localhost
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      showBrowserNotification(
        'Voice input blocked',
        'Mic-to-type needs HTTPS (or run on localhost). Please open the app on https or localhost.',
        'warning'
      );
      return;
    }
    
    try {
      // If already listening, stop (toggle behavior)
      if (isListeningRef.current) {
        stopVoiceInput();
        return;
      }

      // Best-effort permission warmup (SpeechRecognition may still work even if this fails)
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          console.log('🎤 Requesting microphone permission...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('🎤 Microphone permission granted');
          stream.getTracks().forEach(track => track.stop());
        } catch (permErr: any) {
          console.warn('🎤 Microphone warmup failed (continuing):', permErr?.name, permErr?.message);
        }
      }

      console.log('🎤 Initializing voice recognition...');
      initVoiceRecognition();
    } catch (err: any) {
      console.error('🎤 Microphone permission error:', err.name, err.message);
      let errorMessage = 'Microphone access failed';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please click the microphone icon in your browser address bar and allow access.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Microphone is already in use by another application.';
      }
      
      showBrowserNotification('Microphone Error', errorMessage, 'error');
    }
  };

  const initVoiceRecognition = () => {
    console.log('🎤 initVoiceRecognition called');
    
    // Clear any existing timeout
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
    
    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (e) {
        console.log('🎤 Stopping previous recognition instance');
      }
      recognitionRef.current = null;
    }
    
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      console.log('🎤 Creating SpeechRecognition instance...');
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      console.log('🎤 SpeechRecognition instance created');
      
      // Optimize settings for better accuracy
      recognition.continuous = true; // Keep listening until manually stopped
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      // Support browser locale and Indian languages better
      recognition.lang = navigator.language || 'en-IN';
      
      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        console.log('🎤 Voice recognition started');
        showBrowserNotification('Listening...', 'Speak now', 'info');
      };

      // Reset accumulated transcript at start
      accumulatedTranscriptRef.current = '';

      recognition.onresult = (event: any) => {
        console.log('🎤 Voice result event:', event.results);

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcript;
            accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + transcript.trim();
          } else {
            interimTranscript += transcript;
          }
        }

        const prefix = voiceInputPrefixRef.current;
        const prefixSeparator = prefix ? ' ' : '';

        // Show interim transcript in input for live feedback
        if (interimTranscript.trim()) {
          console.log('🎤 Interim:', interimTranscript.trim());
          const displayText = prefix + prefixSeparator + accumulatedTranscriptRef.current + (accumulatedTranscriptRef.current ? ' ' : '') + interimTranscript.trim();
          setInputMessage(displayText);
        }

        // Update with final result
        if (finalTranscript.trim()) {
          const cleanedText = prefix + prefixSeparator + accumulatedTranscriptRef.current;
          setInputMessage(cleanedText);
          console.log('🎤 Final voice input:', cleanedText);
          showBrowserNotification('Voice Added', finalTranscript.trim(), 'success');

          // Reset auto-stop timeout on each final result
          if (voiceTimeoutRef.current) {
            clearTimeout(voiceTimeoutRef.current);
            voiceTimeoutRef.current = null;
          }
          // Auto-stop after 3 seconds of silence
          voiceTimeoutRef.current = setTimeout(() => {
            stopVoiceInput();
          }, 3000);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        isListeningRef.current = false;
        setIsListening(false);
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
        
        let errorMessage = 'Voice recognition failed';
        let errorType = 'error';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking clearly.';
            errorType = 'info';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access.';
            errorType = 'error';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            errorType = 'error';
            break;
          case 'service-not-allowed':
            errorMessage = 'Voice recognition service not available. Please try again later.';
            errorType = 'warning';
            break;
          default:
            errorMessage = `Voice error: ${event.error}`;
        }
        
        showBrowserNotification('Voice Recognition Error', errorMessage, errorType);
      };
      
      recognition.onend = () => {
        console.log('🎤 Voice recognition ended');
        // If we're still in listening mode, restart recognition
        if (isListeningRef.current && recognitionRef.current === recognition) {
          console.log('🎤 Restarting recognition...');
          setTimeout(() => {
            try {
              if (recognitionRef.current === recognition) {
                recognition.start();
                console.log('🎤 Recognition restarted');
              }
            } catch (e) {
              console.log('🎤 Restart failed:', e);
              isListeningRef.current = false;
              setIsListening(false);
              recognitionRef.current = null;
            }
          }, 100);
        } else {
          isListeningRef.current = false;
          setIsListening(false);
          recognitionRef.current = null;
        }
      };
      
      // Start recognition
      try {
        console.log('🎤 Starting recognition...');
        recognition.start();
        console.log('🎤 Recognition started successfully');
      } catch (e) {
        console.error('🎤 Error starting recognition:', e);
        showBrowserNotification('Voice Error', 'Could not start voice recognition. Please try again.', 'error');
        setIsListening(false);
        return;
      }
      
      // Auto-stop after 10 seconds if no speech
      voiceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.log('🎤 Recognition already stopped');
          }
          showBrowserNotification('Timeout', 'No speech detected for 10 seconds', 'info');
        }
      }, 10000);
      
    } catch (error) {
      console.error('🎤 Error in initVoiceRecognition:', error);
      setIsListening(false);
      showBrowserNotification('Voice Input Failed', 'Unable to start voice recognition. Please refresh the page and try again.', 'error');
    }
  };

  const stopVoiceInput = useCallback(() => {
    // Clear timeout first
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
    
    isListeningRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (e) {
        console.log('Voice recognition already stopped');
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    console.log('🎤 Voice input stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.abort();
        } catch (e) {
          console.log('Cleanup: recognition already stopped');
        }
      }
    };
  }, []);

  const textToSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);
  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
  }, [onlineUsers]);
  useEffect(() => {
    if (!propSocket || !messages.length) return;
    
    // Mark messages as read when they come into view
    const unreadMessages = messages.filter(m => 
      !m.read && 
      user && (m.to === user.name || m.groupId) && 
      m.senderId !== user._id
    );
    
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(m => {
        propSocket.emit('mark_message_read', { messageId: m.id, userId: user._id });
      });
      
      // Update local state
      setMessages(prev => prev.map(m => 
        unreadMessages.some(um => um.id === m.id) 
          ? { ...m, read: true, readAt: new Date().toISOString() }
          : m
      ));
    }
  }, [isSocketConnected, propSocket, selectedUser, selectedGroup, activeTab, user]);

  useEffect(() => {
    if (activeFeed === 'reels') {
      setShowSidebar(false);
    }
  }, [activeFeed]);

  // Join appropriate rooms when selected user or group changes
  useEffect(() => {
    if (!propSocket || !user || !isSocketConnected) return;

    // Join group room if group is selected
    if (selectedGroup && selectedGroup._id) {
      propSocket.emit('join_room', { room: String(selectedGroup._id) });
      console.log("📤 Joined group room:", selectedGroup._id);
    }

    // Join private chat room for selected user (messages are sent to recipient's room)
    if (selectedUser && selectedUser._id) {
      // The sender's room is already joined in setup, but we can ensure recipient room is accessible
      console.log("📤 Private chat selected with:", selectedUser.name, "ID:", selectedUser._id);
      // Also join recipient's room to ensure we receive messages
      propSocket.emit('join_room', { room: String(selectedUser._id) });
      console.log("📤 Joined recipient room:", selectedUser._id);
      
      // Also join our own room to ensure we receive messages sent to us
      propSocket.emit('join_room', { room: String(user?._id) });
      console.log("📤 Joined own room:", user?._id);
    }
  }, [selectedUser, selectedGroup, propSocket, user, isSocketConnected]);

  // Add debugging function to window for testing
  useEffect(() => {
    (window as any).testTranslation = async (text: string, targetLang: string = 'en') => {
      console.log('[Test] Starting translation test:', { text, targetLang });
      try {
        const response = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            targetLanguage: targetLang,
            sourceLanguage: 'auto'
          })
        });
        console.log('[Test] Response status:', response.status);
        const data = await response.json();
        console.log('[Test] Response data:', data);
        return data;
      } catch (error) {
        console.error('[Test] Translation error:', error);
        return error;
      }
    };
  }, []);

  const playSound = (url: string) => {
    try {
      const audio = new Audio(url);
      audio.volume = 0.5;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.warn("Audio play blocked or failed:", e.message);
        });
      }
    } catch (error) {
      console.warn("Audio playback failed:", error);
    }
  };
  useEffect(() => {
    // Check if user is logged in, if not redirect to login
    const storedUser = localStorage.getItem('user');
    
    // Give time for user prop to arrive from parent (App.tsx)
    // If no user after delay and no stored user, then redirect
    if (!user && !storedUser) {
      const redirectTimer = setTimeout(() => {
        if (!user && !localStorage.getItem('user')) {
          navigate('/login', { replace: true });
        }
      }, 500); // Small delay to let prop arrive
      return () => clearTimeout(redirectTimer);
    }
    
    // If user is in localStorage but not in state, set it
    if (!user && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
      }
    }
  }, [navigate, user]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    propSocket?.disconnect();
    navigate('/login');
  };

  const showBrowserNotification = (title: string, body: string, type?: string, chatKey?: string) => {
    // Close existing notification for this chat if present
    if (chatKey) {
      const existingNotification = activeNotificationsRef.current.get(chatKey);
      if (existingNotification) {
        existingNotification.close();
        activeNotificationsRef.current.delete(chatKey);
      }
    }
    
    let notification: Notification | null = null;
    
    if (user && Notification.permission === "granted") {
      notification = new Notification(title, { body, icon: user.pic });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted" && user) {
          notification = new Notification(title, { body, icon: user.pic });
        }
      });
    }
    
    // Store notification reference so it can be closed when chat is opened
    if (chatKey && notification) {
      activeNotificationsRef.current.set(chatKey, notification);
      
      // Auto-remove from tracking when notification is closed
      notification.onclose = () => {
        activeNotificationsRef.current.delete(chatKey);
      };
      notification.onclick = () => {
        activeNotificationsRef.current.delete(chatKey);
      };
    }

    // For notifications not tied to a specific chatKey (ex: story events),
    // auto-close so they don't keep stacking.
    if (!chatKey && notification) {
      setTimeout(() => {
        try {
          notification?.close();
        } catch {
          // ignore
        }
      }, 7000);
    }
  };

  useEffect(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (user) {
      setProfilePic(user.pic);
    }
  }, [user?.pic]);

  useEffect(() => {
    const fetchUsersAndGroups = async () => {
      if (!user) return;
      try {
        const [usersRes, groupsRes, friendsRes, requestsRes, sentRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/groups'),
          fetch(`/api/friends/${user._id}`),
          fetch(`/api/friends/requests/${user._id}`),
          fetch(`/api/friends/sent/${user._id}`)
        ]);
        
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setAllUsers(usersData);
          
          // Check if there's a selected online user from LiveOnlinePanel
          const selectedOnlineUser = localStorage.getItem('selectedOnlineUser');
          if (selectedOnlineUser) {
            try {
              const parsedUser = JSON.parse(selectedOnlineUser);
              // Find the full user data from fetched users
              const fullUser = usersData.find((u: any) => u._id === parsedUser.userId || u.name === parsedUser.name);
              if (fullUser) {
                setSelectedUser(fullUser);
                setSelectedGroup(null);
                // Clear the selection after using it
                localStorage.removeItem('selectedOnlineUser');
              }
            } catch (e) {
              console.error('Error parsing selectedOnlineUser:', e);
            }
          }
        }
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          // Filter out deleted groups from localStorage
          const deletedGroups = JSON.parse(localStorage.getItem('deletedGroups') || '[]');
          const filteredGroups = groupsData.filter((g: any) => !deletedGroups.includes(g._id));
          setGroups(filteredGroups);
          localStorage.setItem('userGroups', JSON.stringify(filteredGroups));
        }
        if (friendsRes.ok) {
          const friendsData = await friendsRes.json();
          setFriends(friendsData);
          localStorage.setItem('friends', JSON.stringify(friendsData));
        }
        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          setFriendRequests(requestsData);
        }
        if (sentRes.ok) {
          const sentData = await sentRes.json();
          setSentFriendRequests(sentData);
        }
      } catch (error) {
        console.error('Error fetching users and groups:', error);
      }
    };
    fetchUsersAndGroups();
  }, [user]);

  // Load messages from localStorage when user changes (only on initial load)
  const hasLoadedMessages = useRef(false);
  useEffect(() => {
    if (!user?._id || hasLoadedMessages.current) return;
    
    const storedMessages = localStorage.getItem(`messages_${user._id}`);
    if (storedMessages) {
      try {
        const parsedMessages = JSON.parse(storedMessages);
        setMessages(parsedMessages.sort((a, b) => 
          new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
        ));
        console.log(`📦 Loaded ${parsedMessages.length} messages from localStorage`);
        hasLoadedMessages.current = true;
      } catch (e) {
        console.error('Error parsing stored messages:', e);
      }
    }
  }, [user?._id]);
  
  // Save messages to localStorage with debouncing to prevent infinite loops
  useEffect(() => {
    if (!user?._id || messages.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      // Only save messages that belong to this user (sent or received)
      const userMessages = messages.filter(m => 
        m.senderId === user._id || 
        m.to === user.name || 
        m.user === user.name
      );
      
      localStorage.setItem(`messages_${user._id}`, JSON.stringify(userMessages));
      console.log(`💾 Saved ${userMessages.length} messages to localStorage`);
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [messages, user?._id]);

  // Poll for scheduled messages every 30 seconds (fallback when Redis/BullMQ is not running)
  useEffect(() => {
    if (!user?._id) return;

    const processScheduledMessages = async () => {
      try {
        const response = await fetch('/api/message/process-scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user._id })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.processed > 0) {
            console.log(`📅 Auto-sent ${data.processed} scheduled messages`);
            // Refresh messages to show newly sent scheduled messages
            if (selectedUser || selectedGroup) {
              // Trigger a message refresh by simulating propSocket reconnect
              // or we could just fetch messages again
            }
          }
        }
      } catch (error) {
        // Silent fail - don't show errors for polling
        console.log('Scheduled message poll:', error);
      }
    };

    // Run immediately on mount
    processScheduledMessages();

    // Then every 30 seconds
    const interval = setInterval(processScheduledMessages, 30000);

    return () => clearInterval(interval);
  }, [user?._id]);

  // Fetch reels feed (Instagram-like) for Reels panel.
  useEffect(() => {
    const fetchReels = async () => {
      try {
        const res = await fetch('/api/reels');
        if (res.ok) setReels(await res.json());
      } catch (e) {
        console.error('Error fetching reels:', e);
      }
    };
    fetchReels();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchMessages = async () => {
      try {
        let url = `/api/messages?userId=${user._id}&`;
        if (selectedGroup) {
          url += `groupId=${selectedGroup._id}`;
        } else if (selectedUser) {
          url += `user=${user.name}&to=${selectedUser.name}`;
        } else if (activeTab === 'ai') {
          url += `user=${user.name}&to=My Assistant`;
        } else if (activeTab === 'blind') {
          url += `isBlind=true`;
        } else {
          url += `user=${user.name}`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          // Apply local deletions and edits
          const editedMessages = JSON.parse(localStorage.getItem('editedMessages') || '{}');
          const processedData = data.map((msg: any) => {
            if (msg.isBlind) {
              return { ...msg, user: 'Anonymous', profilePic: undefined };
            }
            // Apply local edit if exists
            if (editedMessages[msg.id]) {
              return { ...msg, text: editedMessages[msg.id].text, isEdited: true, editedAt: editedMessages[msg.id].editedAt };
            }
            return msg;
          });
          // Merge with existing messages instead of replacing to preserve localStorage messages
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newFromApi = processedData.filter((m: Message) => !existingIds.has(m.id));
            const merged = [...prev, ...newFromApi].sort((a, b) =>
              new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
            );
            console.log(`📥 Merged ${newFromApi.length} new messages from API with ${prev.length} existing`);
            return merged;
          });
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    fetchMessages();
  }, [selectedUser?._id, selectedGroup?._id, activeTab, user?._id]);

  // Close summary options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSummaryOptions) {
        const target = event.target as Element;
        if (!target.closest('.summary-options-container')) {
          setShowSummaryOptions(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSummaryOptions]);

  // Track if user is near bottom (for auto-scroll)
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesRef = useRef(messages);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle scroll events to detect if user is near bottom
  const handleScroll = useCallback(() => {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setIsNearBottom(isBottom);
    setShowScrollButton(!isBottom && scrollHeight > clientHeight);
  }, []);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    const container = document.getElementById('messages-container');
    if (!container) return;

    // Only auto-scroll if user is near bottom or it's the first load
    if (isNearBottom && messages.length !== messagesRef.current.length) {
      // Cancel any pending scroll
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Use requestAnimationFrame for smooth scroll
      scrollTimeoutRef.current = setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
      
      messagesRef.current = messages;
    }
  }, [messages, isNearBottom]);

  // Manual scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const container = document.getElementById('messages-container');
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
      setShowScrollButton(false);
    }
  }, []);

  // Ghost message auto-deletion after 60 seconds (1 minute)
  // This runs on ALL clients (sender + receivers) independently
  useEffect(() => {
    console.log('👻 Ghost timer started - checking every second');
    
    const interval = setInterval(() => {
      const now = Date.now();
      
      setMessages(prev => {
        const messagesToDelete: string[] = [];
        
        // Find ghost messages that need to be deleted (60 seconds = 1 minute)
        prev.forEach(msg => {
          if (msg.isGhost && msg.timestamp) {
            const messageAge = (now - new Date(msg.timestamp).getTime()) / 1000;
            console.log(`👻 Ghost message ${msg.id.slice(0, 8)} age: ${Math.floor(messageAge)}s`);
            
            if (messageAge >= 60) { // 60 seconds = 1 minute
              messagesToDelete.push(msg.id);
              console.log(`\ud83d\udc7b Ghost message ${msg.id.slice(0, 8)} expired (${Math.floor(messageAge)}s old) - DELETING NOW`);
            }
          }
        });
        
        // Delete expired ghost messages locally
        const updated = prev.filter(msg => !messagesToDelete.includes(msg.id));
        
        // Emit socket event for each deleted message to sync with other clients
        messagesToDelete.forEach(messageId => {
          // Notify server to delete from DB and notify other clients
          const currentSocket = propSocketRef.current;
          if (currentSocket?.connected) {
            console.log(`\ud83d\udc7b Emitting delete_ghost_message for: ${messageId.slice(0, 8)}`);
            currentSocket.emit('delete_ghost_message', {
              messageId,
              timestamp: now.toString()
            });
          } else {
            console.log(`\ud83d\udc7b Socket not connected, cannot emit delete for: ${messageId.slice(0, 8)}`);
          }
        });
        
        // Debug: Log remaining ghost messages
        const remainingGhostMessages = updated.filter(msg => msg.isGhost);
        if (remainingGhostMessages.length > 0) {
          console.log(`👻 Remaining ghost messages: ${remainingGhostMessages.length}`);
        }
        
        return updated;
      });
    }, 1000); // Check every second
    
    return () => {
      console.log('👻 Ghost timer stopped');
      clearInterval(interval);
    };
  }, []); // Empty deps - run once on mount, timer continues forever

  useEffect(() => {
    if (!user) {
      console.log("❌ No user found, cannot connect propSocket");
      return () => {};
    }

    // IMPORTANT: on refresh propSocket can be briefly `null` while App.tsx reconnects.
    // Prevent the whole ChatPage from crashing (white screen).
    if (!propSocket) {
      console.error("❌ No propSocket provided from App.tsx");
      return () => {};
    }

    console.log("🔌 Using propSocket from parent component (App.tsx)");

    // Set up propSocket event listeners for propSocket
    function handleConnect() {
      console.log("✅ PropSocket connected with ID:", propSocket?.id);
      if (user && user.name && propSocket) {
        propSocket.emit('setup', { _id: user._id, name: user.name });
        console.log("📤 Sent user setup for:", user.name);

        // Join user's personal room for private messages
        propSocket.emit('join_room', { room: String(user._id) });
        console.log("📤 Joined personal room:", user._id);
      }
      propSocket?.emit('get_online_users');
    }

    function handleDisconnect() {
      console.log("❌ PropSocket disconnected");
    }

    propSocket.on('connect', handleConnect);
    propSocket.on('disconnect', handleDisconnect);

    // If already connected, set up immediately
    if (propSocket.connected) {
      if (user && user.name) {
        propSocket.emit('setup', { _id: user._id, name: user.name });
        
        // Join user's personal room for private messages
        propSocket.emit('join_room', { room: String(user._id) });
        console.log("📤 Joined personal room (already connected):", user._id);
      }
      propSocket.emit('get_online_users');
    }

    // Socket event handlers - all active now
    propSocket.on('user_logged_in', async (newUser) => {
      console.log("Received user_logged_in:", newUser);
      const res = await fetch('/api/users');
      if (res.ok) {
        const users = await res.json();
        setAllUsers(users);
        
        // Scammer Detection Logic
        const verified = new Set<string>();
        const suspicious = new Set<string>();
        
        users.forEach((u: UserType) => {
          // Check for suspicious patterns
          const isSuspicious =
            u.name.toLowerCase().includes('admin') ||
            u.name.toLowerCase().includes('support') ||
            u.name.toLowerCase().includes('security') ||
            u.name.toLowerCase().includes('verify') ||
            u.name.match(/\d{4,}/) || // Contains 4+ consecutive digits
            u.name.length < 3 || // Too short
            u.name.length > 20; // Too long

          // Check for verified patterns
          const isVerified =
            u.name.toLowerCase().includes('admin') || // Admin users
            u.name.toLowerCase().includes('verified') || // Verified users
            (!u.name.includes('!') && // No special chars
            !u.name.includes('$') &&
            !u.name.includes('0x') && // No hex patterns
            u._id && // Has valid ID
            u._id.length > 10); // Valid ID length

          if (isVerified) {
            verified.add(u._id);
          }
          if (isSuspicious) {
            suspicious.add(u._id);
          }
        });
        
        setVerifiedUsers(verified);
        setSuspiciousUsers(suspicious);
        
        // Show notification for suspicious users
        if (suspicious.size > 0) {
          addNotification(`⚠️ ${suspicious.size} suspicious user(s) detected. Be careful!`, 'error');
        }
      }
    });

    propSocket.on('user_verified', (data: { userId: string, userName: string }) => {
      if (data.userId === user._id) {
        showBrowserNotification('✅ Account Verified', 'Your account has been verified!', 'success');
        setUser(user ? { ...user, isVerified: true } : null);
      } else {
        showBrowserNotification('🔐 User Verified', `${data.userName} is now verified!`, 'info');
        setVerifiedUsers(prev => new Set(prev).add(data.userId));
      }
    });

    propSocket.on('verification_request', (data: { userId: string, userName: string }) => {
      showBrowserNotification('📋 Verification Request', `${data.userName} requested verification`, 'info');
    });

    propSocket.on('user_status_change', (updatedUsers: UserType[] | UserType) => {
      const usersArray = Array.isArray(updatedUsers) ? updatedUsers : [updatedUsers];
      console.log("📥 Received user_status_change:", usersArray.map(u => `${u.name} (${u.isOnline ? 'online' : 'offline'})`));
      console.log("📊 Total users received:", usersArray.length);
      const currentUser = userRef.current;
      const filtered = usersArray.filter(u => u.name !== currentUser?.name);
      console.log("🔍 Filtered users (excluding self):", filtered.map(u => u.name));
      setOnlineUsers(filtered);

      setAllUsers(prevUsers => {
        return prevUsers.map(u => {
          const onlineUser = usersArray.find(updated => ((updated as any)._id || (updated as any).userId) === u._id);
          if (onlineUser) {
            console.log(`✅ ${u.name} is now ${onlineUser.isOnline ? 'online' : 'offline'}`);
            return { ...u, isOnline: onlineUser.isOnline, lastSeen: onlineUser.lastSeen };
          }
          return u;
        });
      });

      // Show notification for friends coming online/going offline
      // Use onlineUsersRef to get current state and avoid stale closure
      const currentOnlineUsers = onlineUsersRef.current;
      filtered.forEach(updatedUser => {
        const wasOnline = currentOnlineUsers.some(u => u._id === updatedUser._id);
        const isOnline = updatedUser.isOnline;

        if (isOnline && !wasOnline) {
          const status = updatedUser.isVerified ? '🟢✅' : '🟢';
          showBrowserNotification(status, `${updatedUser.name} is now online${updatedUser.isVerified ? ' (Verified)' : ''}`);
          playSound(RECEIVE_SOUND);
        } else if (!isOnline && wasOnline) {
          showBrowserNotification('🔴 Offline', `${updatedUser.name} went offline`);
        }
      });
    });


    const messageMatchesOpenChat = (msg: Message): boolean => {
      const selU = selectedUserRef.current;
      const selG = selectedGroupRef.current;
      const tab = activeTabRef.current;
      const currentUser = userRef.current;
      
      if (msg.isSystem) return true;
      if (tab === 'blind') return !!msg.isBlind;
      if (msg.isBlind) return false;
      
      // Handle group messages
      if (selG) {
        return String(msg.groupId) === String(selG._id);
      }
      
      // Handle AI chat
      if (tab === 'ai') {
        return (msg.user === currentUser?.name && msg.to === 'My Assistant') ||
          (msg.user === 'My Assistant' && msg.to === currentUser?.name);
      }
      
      // Handle private user chats
      if (selU) {
        const isPrivate =
          // Messages between current user and selected user
          (msg.user === currentUser?.name && msg.to === selU.name) ||
          (msg.user === selU.name && msg.to === currentUser?.name) ||
          // Handle forwarded/shared messages where current user is recipient
          (msg.to === currentUser?.name && msg.user === selU.name) ||
          // Handle messages sent by current user to selected user
          (msg.user === currentUser?.name && msg.to === selU.name) ||
          // Handle forwarded messages - check if original sender is selected user and recipient is current user
          (msg.isForwarded && msg.forwardedFrom === selU.name && msg.to === currentUser?.name) ||
          // Handle forwarded messages - check if current user forwarded to selected user
          (msg.isForwarded && msg.user === currentUser?.name && msg.to === selU.name);

        // Allow AI "Explain" bubbles to appear inside the currently opened private chat.
        const isAiExplain =
          !!msg.isAI &&
          msg.user === "My Assistant" &&
          (msg.to === selU.name || msg.to === currentUser?.name);

        // Show the private chat if the message belongs to the selected user
        if (isPrivate || isAiExplain) {
          return true;
        }
      }

      // Handle global chat (no specific recipient and no group)
      return !msg.to && !msg.groupId;
    };

    // Listen for online users updates
    propSocket.on('online_users', (users: any[]) => {
      console.log('📨 Received online users:', users);
      console.log('📨 Online users count:', users.length);
      console.log('📨 Current user:', user?.name);
      setOnlineUsers(users);
      
      // Check if other users are online
      const otherUsers = users.filter(u => u._id !== user?._id);
      console.log('📨 Other users available for chat:', otherUsers);
    });

    propSocket.on('message received', (newMessage: any) => {
      console.log("📨 Received message in client:", newMessage);
      console.log("📨 Message from:", newMessage.user, "to:", newMessage.to);
      console.log("📨 Current selected user:", selectedUser?.name, "ID:", selectedUser?._id);
      console.log("📨 Current user name:", user?.name, "ID:", user?._id);
      console.log("📨 Message timestamp:", newMessage.timestamp);
      console.log("📨 Message text:", newMessage.text);
      console.log("📨 Message type:", newMessage.type);
      
      // Log ghost message specifically
      if (newMessage.isGhost) {
        console.log(`\ud83d\udc7b GHOST MESSAGE received: ${newMessage.id}, will auto-delete in 60s`);
        console.log('👻 Full ghost message data:', {
          id: newMessage.id,
          isGhost: newMessage.isGhost,
          timestamp: newMessage.timestamp,
          user: newMessage.sender?.name || newMessage.user
        });
      }

      const isBlindMsg = newMessage.isBlind;
      const message: Message = {
        id: newMessage.id || newMessage._id || Math.random().toString(36).substr(2, 9),
        user: isBlindMsg ? 'Anonymous' : (newMessage.sender?.name ?? newMessage.user),
        senderId: newMessage.sender?._id ?? newMessage.senderId,
        to: newMessage.to,
        groupId: newMessage.groupId != null ? String(newMessage.groupId) : undefined,
        text: newMessage.content || newMessage.text,
        image: newMessage.image,
        video: newMessage.video,
        audio: newMessage.audio,
        timestamp: newMessage.timestamp || new Date().toISOString(),
        profilePic: isBlindMsg ? undefined : (newMessage.sender?.pic ?? newMessage.profilePic),
        isGhost: newMessage.isGhost,
        isAI: newMessage.isAI,
        isSystem: newMessage.isSystem,
        isBlind: isBlindMsg,
        isForwarded: newMessage.isForwarded,
        forwardedFrom: newMessage.forwardedFrom,
        originalMessageId: newMessage.originalMessageId,
        isScheduled: newMessage.isScheduled,
        status: newMessage.status || newMessage.deliveryStatus,
        scheduledTime: newMessage.scheduledTime,
        sentiment: analyzeSentiment(newMessage.content || newMessage.text || ''),
        originalText: newMessage.originalText,
        readBy: newMessage.readBy || [],
        deliveredAt: newMessage.deliveredAt,
        sender: undefined,
        reelId: newMessage.reelId,
        reelData: newMessage.reelData
      };

      console.log("📝 Processed message:", message);
      console.log("🎯 Does message match current chat?", messageMatchesOpenChat(message));

      // Enhanced message handling without reload - IMMEDIATE ADD
      if (messageMatchesOpenChat(message)) {
        setMessages((prev) => {
          const existingMsgIndex = prev.findIndex(m => m.id === message.id);
          if (existingMsgIndex !== -1) {
            // Message exists - preserve translation fields and update
            const existingMsg = prev[existingMsgIndex];
            const updated = [...prev];
            updated[existingMsgIndex] = {
              ...existingMsg,
              ...message,
              translatedText: existingMsg.translatedText || message.translatedText,
              originalText: existingMsg.originalText || message.originalText,
              explainedText: existingMsg.explainedText || message.explainedText
            };
            return updated;
          }

          // Add message and sort by timestamp immediately
          if (message.isGhost) {
            console.log(`👻 Adding ghost message to state: ${message.id}`);
            
            // Check if ghost message is already expired
            const now = Date.now();
            const messageAge = (now - new Date(message.timestamp).getTime()) / 1000;
            if (messageAge >= 60) {
              console.log(`\ud83d\udc7b Ghost message ${message.id} already expired (${Math.floor(messageAge)}s old) - NOT ADDING`);
              return prev; // Don't add expired ghost message
            }
          }
          
          // Auto-translate incoming messages if translation is enabled
          if (isOutgoingTranslationEnabled && message.text && message.senderId !== userRef.current?._id) {
            setTimeout(() => {
              autoTranslateIncomingMessage(message.id, message.text!, outgoingTargetLang);
            }, 100);
          }
          
          const updated = [...prev, message];
          const sorted = updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          // Debug: Log total ghost messages after adding
          const totalGhostMessages = sorted.filter(m => m.isGhost);
          if (totalGhostMessages.length > 0) {
            console.log(`👻 Total ghost messages in state: ${totalGhostMessages.length}`);
          }
          
          return sorted;
        });
        
        // Only auto-scroll if user is near bottom
        if (isNearBottom) {
          requestAnimationFrame(() => {
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          });
        }
      } else {
        console.log("❌ Message doesn't match current chat, showing notification");
        // Show notification for messages not in current chat
        if (!isBlindMsg && message.user !== userRef.current?.name && !message.isSystem) {
          // Determine chatKey for this message
          let msgChatKey = '';
          if (message.groupId) {
            msgChatKey = `group_${message.groupId}`;
          } else if (message.to === userRef.current?.name) {
            msgChatKey = `user_${message.senderId}`;
          } else if (!message.to && !message.groupId && !message.isAI && !message.isBlind) {
            msgChatKey = 'global';
          }
          showBrowserNotification(`New message from ${message.user}`, message.text?.substring(0, 50) + '...', 'info', msgChatKey || undefined);
          playSound(RECEIVE_SOUND);
        }
      }

      const isForMe = message.user !== userRef.current?.name;
      if (isForMe && messageMatchesOpenChat(message)) {
        // Generate smart replies only for messages in current chat
        generateSmartReplies(message.text || '');
      }
    });

    propSocket.on('receive_message', (raw: Message) => {
      console.log("📨 receive_message event triggered:", raw);
      console.log("📨 Message from:", raw.user, "to:", raw.to);
      console.log("📨 Current user:", user?.name, "ID:", user?._id);
      console.log("📨 Selected user:", selectedUser?.name, "ID:", selectedUser?._id);
      
      const message: Message = {
        ...raw,
        groupId: raw.groupId != null ? String(raw.groupId) : undefined,
        senderId: raw.senderId != null ? String(raw.senderId) : undefined,
        to: raw.to != null ? String(raw.to) : undefined,
        timestamp: raw.timestamp || new Date().toISOString()
      };

      if (messageMatchesOpenChat(message)) {
        setMessages((prev) => {
          const existingMsgIndex = prev.findIndex(m => m.id === message.id);
          if (existingMsgIndex !== -1) {
            // Message exists - preserve translation fields
            const existingMsg = prev[existingMsgIndex];
            // Preserve translated text and original text if they exist locally
            const messageWithPreservedFields = {
              ...message,
              translatedText: existingMsg.translatedText || message.translatedText,
              originalText: existingMsg.originalText || message.originalText,
              explainedText: existingMsg.explainedText || message.explainedText
            };
            if (existingMsg.isScheduled && existingMsg.status === 'scheduled' && !message.isScheduled) {
              // Update scheduled message to sent status
              console.log("✅ Scheduled message sent, updating status:", message.id);
              const updated = [...prev];
              updated[existingMsgIndex] = {
                ...existingMsg,
                ...messageWithPreservedFields,
                isScheduled: false,
                status: 'sent',
                deliveryStatus: 'delivered'
              };
              return updated;
            }
            // Update existing message while preserving translation
            const updated = [...prev];
            updated[existingMsgIndex] = { ...existingMsg, ...messageWithPreservedFields };
            return updated;
          }
          
          // Add message and sort by timestamp immediately
          let finalMessage = message;
          
          // Auto-translate incoming messages if translation is enabled
          if (isOutgoingTranslationEnabled && message.text && message.senderId !== userRef.current?._id) {
            // Don't block - translate asynchronously after adding
            setTimeout(() => {
              autoTranslateIncomingMessage(message.id, message.text!, outgoingTargetLang);
            }, 100);
          }
          
          const updated = [...prev, finalMessage];
          return updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });
        
        // Only auto-scroll if user is near bottom
        if (isNearBottom) {
          requestAnimationFrame(() => {
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          });
        }
      }

      if (message.user !== userRef.current?.name && !messageMatchesOpenChat(message)) {
        playSound(RECEIVE_SOUND);
        // Show notification only for messages not in current chat
        const senderName = message.user === 'My Assistant' ? 'AI Assistant' : message.user;
        const label = message.groupId ? 'Group' : (message.to ? senderName : 'Global');
        
        let chatKey = '';
        if (message.groupId) {
          chatKey = `group_${message.groupId}`;
        } else if (message.to === userRef.current?.name) {
          chatKey = `user_${message.senderId}`;
        } else if (!message.to && !message.groupId && !message.isAI && !message.isBlind) {
          chatKey = 'global';
        }
        
        const unreadCount = chatKey ? (unreadMessageCounts.get(chatKey) || 0) + 1 : 1;
        const countText = unreadCount > 1 ? ` (${unreadCount} messages)` : '';
        showBrowserNotification(`New message from ${label}${countText}`, message.text || '', 'info', chatKey || undefined);
      }

      // Update mood color based on sentiment
      if (message.sentiment === '😊' || message.sentiment === '🔥') setMoodColor('emerald');
      else if (message.sentiment === '😢' || message.sentiment === '😞') setMoodColor('blue');
      else if (message.sentiment === '😠' || message.sentiment === '😡') setMoodColor('red');
      else if (message.sentiment === '😮' || message.sentiment === '😲') setMoodColor('purple');

      if (message.user !== user?.name && !message.isAI) {
        if (messageMatchesOpenChat(message)) {
          generateSmartReplies(message.text || '');
          const lowerText = (message.text || '').toLowerCase();
          if (lowerText.includes('ai') || lowerText.includes('help') || lowerText.includes('hello intelli')) {
            handleAiResponse(message.text || '');
          }
        }
      }
    });

    propSocket.on("friend_request_received", (request: FriendRequest) => {
      setFriendRequests(prev => [...prev, request]);
      showBrowserNotification('New Friend Request', `${request.from.name} sent you a friend request!`);
      playSound(RECEIVE_SOUND);
    });

    propSocket.on("friend_request_accepted", (data: { from: string }) => {
      showBrowserNotification('Friend Request Accepted', `You and ${data.from} are now friends!`);
      playSound(RECEIVE_SOUND);
      // Refresh friends list
      fetch(`/api/friends/${user._id}`).then(res => res.ok && res.json()).then(data => {
        if (data) {
          setFriends(data);
          localStorage.setItem('friends', JSON.stringify(data));
        }
      });
    });

    propSocket.on('message_edited', (editedMsg: Message) => {
      setMessages(prev => prev.map(m => m.id === editedMsg.id ? { ...m, text: editedMsg.text, isEdited: true, editedAt: editedMsg.editedAt } : m));
      // Save edit to localStorage
      const editedMessages = JSON.parse(localStorage.getItem('editedMessages') || '{}');
      editedMessages[editedMsg.id] = { text: editedMsg.text, editedAt: editedMsg.editedAt };
      localStorage.setItem('editedMessages', JSON.stringify(editedMessages));
    });

    propSocket.on('message_deleted_for_me', ({ id, userId }: { id: string, userId: string }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedFor: [...(m.deletedFor || []), userId] } : m));
    });

    propSocket.on('message_deleted_for_everyone', ({ id }: { id: string }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true, text: '🚫 This message was deleted' } : m));
      // Track deleted message in localStorage
      const deletedMessages = JSON.parse(localStorage.getItem('deletedMessages') || '[]');
      if (!deletedMessages.includes(id)) {
        deletedMessages.push(id);
        localStorage.setItem('deletedMessages', JSON.stringify(deletedMessages));
      }
    });

    propSocket.on('message_deleted', ({ id }: { id: string }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true, text: 'ð This message was deleted' } : m));
    });

    // Listen for ghost message deletions from other users
    propSocket.on('ghost_message_deleted', ({ messageId, timestamp }: { messageId: string, timestamp: string }) => {
      console.log(`\ud83d\udc7b Removing ghost message: ${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      // Also force check for any expired ghost messages as a backup
      setTimeout(() => {
        setMessages(prev => {
          const now = Date.now();
          return prev.filter(msg => {
            if (msg.isGhost && msg.timestamp) {
              const messageAge = (now - new Date(msg.timestamp).getTime()) / 1000;
              return messageAge < 60; // Keep messages younger than 60 seconds
            }
            return true;
          });
        });
      }, 100);
    });

    propSocket.on('all_messages_deleted', () => {
      setMessages([]);
    });

    propSocket.on('message_delivered', ({ messageId, deliveredAt }: { messageId: string, deliveredAt?: string }) => {
      // Update message delivery status for the SENDER (current user)
      setMessages(prev => prev.map(m => 
        m.id === messageId && m.senderId === user?._id 
          ? { 
              ...m, 
              delivered: true, 
              status: 'delivered',
              deliveryStatus: 'delivered',
              deliveredAt: deliveredAt || new Date().toISOString() 
            }
          : m
      ));
    });

    propSocket.on('message_read', ({ messageId, readBy, readAt }: { messageId: string, readBy: string, readAt: string }) => {
      // Update read status for the SENDER's message (current user)
      // readBy here is the person who read the message
      setMessages(prev => prev.map(m => 
        m.id === messageId && m.senderId === user?._id              ? { 
              ...m, 
              read: true, 
              readAt: readAt || new Date().toISOString(), 
              status: 'read' as const,
              deliveryStatus: 'read' as const,
              readBy: [...(m.readBy || []), readBy] 
            }
          : m
      ));
    });

    // Handle message status updates from other users
    propSocket.on('message_status_updated', ({ messageId, status, readBy, readAt }: { messageId: string, status: string, readBy?: string, readAt?: string }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId && m.senderId === user?._id              ? { 
              ...m, 
              status: status as Message['status'],
              deliveryStatus: status as Message['deliveryStatus'],
              read: status === 'read',
              ...(status === 'read' && { 
                readAt: readAt || new Date().toISOString(),
                readBy: readBy ? [...(m.readBy || []), readBy] : (m.readBy || []) 
              })
            }
          : m
      ));
    });

    // Handle scheduled message sent notification from server
    propSocket.on('scheduled_message_sent', ({ messageId }: { messageId: string }) => {
      console.log(`✅ Scheduled message confirmed sent by server: ${messageId}`);
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, isScheduled: false, status: 'sent' as const, deliveryStatus: 'delivered' as const }
          : m
      ));
      setScheduledMessages(prev => prev.filter(m => m.id !== messageId));
    });

    propSocket.on('message_sync', (syncedMessages: Message[]) => {
      console.log("🔄 Received message sync:", syncedMessages.length, "messages");
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMessages = syncedMessages.filter(m => !existingIds.has(m.id));
        const updatedMessages = [...prev, ...newMessages].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        return updatedMessages;
      });
    });

    propSocket.on('typing', (data: any) => {
      const typingUser = data.userId === 'global' ? 'Someone' : data.userName;
      if (typingUser && typingUser !== user?.name) {
        setTypingUsers(prev => new Set(prev).add(typingUser));
      }
    });

    // ==========================
    // Story notifications (from StoriesPage)
    // ==========================
    propSocket.on('story_mention_notification', (data: any) => {
      // Show only for safety; if your chat is open with story owner, this will still show.
      const storyFrom = data?.storyUser || data?.mentionedBy || 'Someone';
      const mentionedBy = data?.mentionedBy || '';
      const mentionedUser = data?.mentionedUser || '';
      showBrowserNotification(
        '📖 Story Mention',
        `${mentionedBy || storyFrom} mentioned you in a story${mentionedUser ? ` (${mentionedUser})` : ''}`,
        'info'
      );
    });

    propSocket.on('story_shared_in_chat', (data: any) => {
      const sharedBy = data?.sharedBy || data?.storyUser || 'Someone';
      const sharedTo = data?.sharedTo || '';
      showBrowserNotification(
        '📖 Story Shared',
        `${sharedBy} shared a story with you${sharedTo ? ` (${sharedTo})` : ''}`,
        'info'
      );
    });

    propSocket.on('story_reaction_in_chat', (data: any) => {
      const reactedBy = data?.reactedBy || 'Someone';
      showBrowserNotification('📖 Story Reaction', `${reactedBy} reacted on a story`, 'info');
    });
    
    propSocket.on('stop typing', (data: any) => {
      const typingUser = data.userId === 'global' ? 'Someone' : data.userName;
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(typingUser);
        return newSet;
      });
    });

    // Reel sharing confirmation and error handlers
    propSocket.on('reel_shared_confirmation', (data: any) => {
      console.log('✅ Reel shared confirmation:', data);
      showBrowserNotification('📸 Reel Shared', `Shared to ${data.friendsCount} friends and ${data.groupsCount} groups`, 'success');
    });

    propSocket.on('share_error', (data: any) => {
      console.error('❌ Reel share error:', data);
      showBrowserNotification('❌ Share Failed', data.error || 'Failed to share reel', 'error');
    });

    propSocket.on('reel_created', (reel: Reel) => {
      setReels((prev) => {
        if (prev.some((r) => r._id === reel._id)) return prev;
        return [reel, ...prev];
      });
    });

    propSocket.on('reel_updated', (reel: Reel) => {
      setReels((prev) => prev.map((r) => (r._id === reel._id ? reel : r)));
    });

    propSocket.on('reel_like_updated', ({ reelId, likes }: { reelId: string; likes: string[] }) => {
      const normalizedLikes = Array.from(new Set(likes || []));
      setReels((prev) =>
        prev.map((r) =>
          r._id === reelId
            ? {
                ...r,
                likes: normalizedLikes,
                liked: user?.name ? normalizedLikes.includes(user.name) : r.liked
              }
            : r
        )
      );
    });

    propSocket.on('reel_deleted', ({ reelId }: { reelId: string }) => {
      setReels((prev) => prev.filter((r) => r._id !== reelId));
    });

    propSocket.on('offer', async (data) => {
      // Filter: ignore offers from self
      if (data.from === user?.name) return;
      
      // Filter: if toUserId is specified, only accept if it's for this user (fallback broadcast handling)
      if (data.toUserId && data.toUserId !== user?._id) {
        console.log("📞 Offer not for this user, ignoring");
        return;
      }
      
      const callKey = `${data.from}-${data.type}`;
      
      // Check if this call was already processed recently (within 70 seconds - longer than auto-reject)
      if (recentIncomingCallsRef.current.has(callKey)) {
        console.log("⚠️ Duplicate incoming call prevented:", data.from);
        return;
      }
      
      // Add to tracking set
      recentIncomingCallsRef.current.add(callKey);
      
      // Clean up after 70 seconds (longer than auto-reject timer)
      setTimeout(() => {
        recentIncomingCallsRef.current.delete(callKey);
      }, 70000);
      
      const callData = { ...data, timestamp: Date.now(), missedCallAdded: false };
      setIncomingCall(callData);
      playSound(CALL_SOUND);
      
      // Show incoming call notification
      showBrowserNotification(`Incoming ${data.type} call`, `${data.from} is calling you...`, 'info');
      
      // Auto-reject after 1 minute - server will handle missed call tracking
      incomingCallTimerRef.current = setTimeout(() => {
        setIncomingCall(prev => {
          if (prev && prev.from === data.from && prev.timestamp === callData.timestamp) {
            // Auto-reject: notify server and clear UI
            propSocket?.emit('call_auto_rejected', {
              fromUserId: user._id,
              fromUserName: user.name,
              toUserId: data.fromUserId,
              toUserName: data.from,
              callType: data.type,
              timestamp: callData.timestamp
            });
            showBrowserNotification(`📞 Missed ${data.type} call`, `${data.from} tried to call you`, 'warning');
            return null;
          }
          return prev;
        });
      }, 60000); // 1 minute auto-reject
    });

    propSocket.on('call_rejected', (data: { fromUserName: string, callType: 'video' | 'audio' }) => {
      showBrowserNotification('Call Rejected', `${data.fromUserName} rejected your ${data.callType} call`, 'warning');
      // Mark that call was ended by other party (prevents duplicate call_missed)
      callRejectedByOtherRef.current = true;
      // End the outgoing call
      endCall();
    });

    propSocket.on('call_not_answered', (data: { toUserName: string, callType: 'video' | 'audio' }) => {
      showBrowserNotification('Call Not Answered', `${data.toUserName} did not answer your ${data.callType} call`, 'warning');
      // Mark that call was ended by other party (prevents duplicate call_missed)
      callRejectedByOtherRef.current = true;
      // End the outgoing call (receiver already got missed call via server)
      endCall();
    });

    // Listen for call subtitles from remote user
    propSocket.on('call_subtitle', (data: { subtitle: Subtitle, fromUserId: string }) => {
      // Compare with socket.id (not user._id) since server sends socket.id
      if (data.fromUserId !== propSocket.id) {
        setCallSubtitles(prev => [...prev.slice(-4), data.subtitle]);
        
        // Add remote subtitle to chat as a system message
        const remoteSubtitleMessage: Message = {
          id: `subtitle_remote_${data.subtitle.id}_${Date.now()}`,
          user: 'remote_translator',
          _id: `subtitle_remote_${data.subtitle.id}_${Date.now()}`,
          sender: { _id: 'remote_translator', name: 'Call Translation', pic: undefined },
          to: user.name,
          text: `🌐 ${data.subtitle.translatedText || data.subtitle.text}`,
          timestamp: new Date().toISOString(),
          isSystem: true,
          isTranslated: true,
          isRemoteTranslation: true,
          originalText: data.subtitle.text,
          translatedText: data.subtitle.translatedText,
          language: data.subtitle.language
        };
        
        setMessages(prev => [...prev, remoteSubtitleMessage]);
        scrollToBottom();
      }
    });

    propSocket.on('answer', async (data) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        // If ICE candidates arrived early, flush them now.
        if (pendingIceCandidatesRef.current.length) {
          const pc = peerConnection.current;
          const buffered = pendingIceCandidatesRef.current;
          pendingIceCandidatesRef.current = [];
          for (const cand of buffered) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.error("Error adding buffered ice candidate", e);
            }
          }
        }
      }
    });

    propSocket.on('ice-candidate', async (data) => {
      if (!peerConnection.current) return;
      const pc = peerConnection.current;
      try {
        // Buffer candidates until we have a remote description.
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          pendingIceCandidatesRef.current.push(data.candidate as RTCIceCandidateInit);
        }
      } catch (e) {
        console.error("Error adding ice candidate", e);
      }
    });

    propSocket.on('reaction_updated', ({ messageId, reactions }: { messageId: string, reactions: any }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    });

    // Listen for profile picture updates from other users
    propSocket.on('user_profile_updated', (data: { userId: string, userName: string, profilePic: string }) => {
      console.log(`👤 Received profile update for ${data.userName}`);

      // Update all users list
      setAllUsers(prev => prev.map(u =>
        u._id === data.userId ? { ...u, pic: data.profilePic } : u
      ));

      // Update online users list
      setOnlineUsers(prev => prev.map(u =>
        u._id === data.userId ? { ...u, pic: data.profilePic } : u
      ));

      // Update selected user if it's the one that updated
      setSelectedUser(prev =>
        prev && prev._id === data.userId ? { ...prev, pic: data.profilePic } : prev
      );

      // Update friends list
      setFriends(prev => prev.map(f =>
        f._id === data.userId ? { ...f, pic: data.profilePic } : f
      ));

      // IMPORTANT: Update all messages from this user with new profile picture
      setMessages(prev => prev.map(msg =>
        msg.sender?._id === data.userId
          ? { ...msg, sender: { ...msg.sender, pic: data.profilePic }, profilePic: data.profilePic }
          : msg
      ));

      // Also update stored messages in localStorage
      const storedMessages = localStorage.getItem('chatMessages');
      if (storedMessages) {
        try {
          const parsedMessages = JSON.parse(storedMessages);
          const updatedMessages = parsedMessages.map((msg: any) =>
            msg.sender?._id === data.userId
              ? { ...msg, sender: { ...msg.sender, pic: data.profilePic }, profilePic: data.profilePic }
              : msg
          );
          localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
        } catch (e) {
          console.error('Error updating stored messages:', e);
        }
      }

      // Show notification
      if (data.userId !== user?._id) {
        showBrowserNotification('👤 Profile Updated', `${data.userName} updated their profile picture`, 'info');
      }
    });
    
    // Listen for reels profile picture updates (from ReelsPage)
    propSocket.on('reels_profile_updated', (data: { userId: string, userName: string, profilePic: string }) => {
      console.log(`🎬 Received reels profile update for ${data.userName}`);
      
      // Update all users list
      setAllUsers(prev => prev.map(u => 
        u._id === data.userId ? { ...u, pic: data.profilePic } : u
      ));
      
      // Update online users list
      setOnlineUsers(prev => prev.map(u => 
        u._id === data.userId ? { ...u, pic: data.profilePic } : u
      ));
      
      // Update selected user if it's the one that updated
      setSelectedUser(prev => 
        prev && prev._id === data.userId ? { ...prev, pic: data.profilePic } : prev
      );
      
      // Update friends list
      setFriends(prev => prev.map(f => 
        f._id === data.userId ? { ...f, pic: data.profilePic } : f
      ));
      
      // IMPORTANT: Update all messages from this user with new profile picture
      setMessages(prev => prev.map(msg => 
        msg.sender?._id === data.userId 
          ? { ...msg, sender: { ...msg.sender, pic: data.profilePic }, profilePic: data.profilePic }
          : msg
      ));
      
      // Also update stored messages in localStorage
      const storedMessages = localStorage.getItem('chatMessages');
      if (storedMessages) {
        try {
          const parsedMessages = JSON.parse(storedMessages);
          const updatedMessages = parsedMessages.map((msg: any) => 
            msg.sender?._id === data.userId 
              ? { ...msg, sender: { ...msg.sender, pic: data.profilePic }, profilePic: data.profilePic }
              : msg
          );
          localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
        } catch (e) {
          console.error('Error updating stored messages:', e);
        }
      }
      
      // Show notification
      if (data.userId !== user?._id) {
        showBrowserNotification('🎬 Reels Profile Updated', `${data.userName} updated their profile picture`, 'info');
      }
    });
    
    // Listen for caller cancelled (when caller ends call before you answer)
    propSocket.on('caller_cancelled', (data: { fromUserId: string, fromUserName: string, callType: 'video' | 'audio', timestamp: number }) => {
      console.log(`📞 Caller cancelled: ${data.fromUserName}`);
      
      // Clear the auto-reject timer since caller already ended
      if (incomingCallTimerRef.current) {
        clearTimeout(incomingCallTimerRef.current);
        incomingCallTimerRef.current = null;
      }
      
      // Clear call timer if any
      if (callTimerRef.current) {
        clearTimeout(callTimerRef.current);
        callTimerRef.current = null;
      }
      
      // Clear incoming call UI
      setIncomingCall(prev => {
        if (prev && prev.from === data.fromUserName) {
          return null;
        }
        return prev;
      });
      
      // Stop any local streams
      setLocalStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      setRemoteStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      setIsCalling(false);
      
      // Close peer connection
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      pendingIceCandidatesRef.current = [];
      remotePeerUserIdRef.current = null;
      
      // Clear call start time
      delete (window as any).currentCallStartTime;
      
      // Reset call state flags
      setTimeout(() => {
        callEndedRef.current = false;
        callRejectedByOtherRef.current = false;
        currentCallIdRef.current = null;
      }, 1000);
      
      showBrowserNotification(`📞 Call Ended`, `${data.fromUserName} ended the call`, 'info');
    });
    
    // Listen for call history updates from server (single source of truth)
    propSocket.on('call_history_update', (data: { type: 'missed' | 'outgoing' | 'received', from?: string, to?: string, callType: 'video' | 'audio', timestamp: number }) => {
      console.log(`📞 Call history update: ${data.type} - ${data.from || data.to}`);
      
      if (data.type === 'missed' && data.from) {
        // Server says someone called me but I missed it - trust server, just add it
        addUniqueMissedCall(data.from, data.callType, data.timestamp);
      } else if (data.type === 'outgoing' && data.to) {
        // My outgoing call record - avoid duplicates
        setOutgoingCalls(prev => {
          const exists = prev.some(call => call.timestamp === data.timestamp);
          if (!exists) {
            return [...prev, { to: data.to, type: data.callType, timestamp: data.timestamp }];
          }
          return prev;
        });
      } else if (data.type === 'received' && data.from) {
        // My received call record - avoid duplicates
        setReceivedCalls(prev => {
          const exists = prev.some(call => call.timestamp === data.timestamp);
          if (!exists) {
            return [...prev, { from: data.from, type: data.callType, timestamp: data.timestamp }];
          }
          return prev;
        });
      }
    });
    
    // Listen for call duration updates
    propSocket.on('call_duration_update', (data: { from?: string, to?: string, callType: 'video' | 'audio', startTime: number, duration: number }) => {
      console.log(`📞 Call duration update: ${data.duration}s`);
      
      // Update the call with duration
      if (data.to) {
        // This is an outgoing call for me
        setOutgoingCalls(prev => prev.map(call => 
          call.timestamp === data.startTime 
            ? { ...call, duration: data.duration }
            : call
        ));
      } else if (data.from) {
        // This is a received call for me
        setReceivedCalls(prev => prev.map(call => 
          call.timestamp === data.startTime 
            ? { ...call, duration: data.duration }
            : call
        ));
      }
    });

    return () => {
      // Clean up all socket listeners to prevent duplicates
      if (propSocket) {
        propSocket.off('connect', handleConnect);
        propSocket.off('disconnect', handleDisconnect);
        propSocket.off('user_status_change');
        propSocket.off('message received');
        propSocket.off('receive_message');
        propSocket.off('message_edited');
        propSocket.off('message_deleted_for_me');
        propSocket.off('message_deleted_for_everyone');
        propSocket.off('message_deleted');
        propSocket.off('reaction_updated');
        propSocket.off('user_profile_updated');
        propSocket.off('reels_profile_updated');
        propSocket.off('friend_request_received');
        propSocket.off('friend_request_accepted');
        propSocket.off('user_verified');
        propSocket.off('verification_request');
        propSocket.off('incoming_call_notification');
        propSocket.off('call_initiated');
        propSocket.off('call_accepted');
        propSocket.off('call_ended');
        propSocket.off('caller_cancelled');
        propSocket.off('offer');
        propSocket.off('answer');
        propSocket.off('ice-candidate');
        propSocket.off('message_sync');
        propSocket.off('story_mention_notification');
        propSocket.off('story_shared_in_chat');
        propSocket.off('story_reaction_in_chat');
        console.log("🔌 Socket listeners cleaned up");
      }
    };
  }, [user, propSocket]); // Re-run when user or socket changes

  useEffect(() => {
    if (!propSocket) return;
    const onRemoteCallEnded = (data?: { fromUserName?: string, fromUserId?: string, reason?: string }) => {
      console.log(`📞 Remote call ended by ${data?.fromUserName || 'Unknown'} (reason: ${data?.reason || 'ended'})`);
      
      // Clear incoming call timer - call was ended by other party
      if (incomingCallTimerRef.current) {
        clearTimeout(incomingCallTimerRef.current);
        incomingCallTimerRef.current = null;
      }
      
      // Clear call timer
      if (callTimerRef.current) {
        clearTimeout(callTimerRef.current);
        callTimerRef.current = null;
      }
      
      setLocalStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      setRemoteStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      setIsCalling(false);
      setIncomingCall(null);
      
      // Close peer connection
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      pendingIceCandidatesRef.current = [];
      remotePeerUserIdRef.current = null;
      
      // Clear call start time
      delete (window as any).currentCallStartTime;
      
      // Reset all call state flags after a short delay
      setTimeout(() => {
        callEndedRef.current = false;
        callRejectedByOtherRef.current = false;
        currentCallIdRef.current = null;
        console.log("📞 Call state reset after remote ended");
      }, 1000);
      
      // Show notification that other user ended the call
      if (data?.fromUserName) {
        showBrowserNotification('Call Ended', `${data.fromUserName} ended the call`, 'info');
      } else {
        showBrowserNotification('Call Ended', 'The call has ended', 'info');
      }
    };
    propSocket.on('call_ended', onRemoteCallEnded);
    return () => {
      propSocket.off('call_ended', onRemoteCallEnded);
    };
  }, [propSocket]);

  useEffect(() => {
    if (!propSocket || !groups.length) return;
    
    // Only join groups that haven't been joined yet
    const joinedGroups = new Set((window as any).joinedGroups || []);
    groups.forEach((g) => {
      if (!joinedGroups.has(g._id)) {
        propSocket.emit('join group', g._id);
        joinedGroups.add(g._id);
      }
    });
    (window as any).joinedGroups = Array.from(joinedGroups);
  }, [propSocket, groups]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
        setShowChat(true);
      } else {
        if (selectedUser) {
          setShowSidebar(false);
          setShowChat(true);
        } else {
          setShowSidebar(true);
          setShowChat(false);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedUser]);

  const handleSelectUser = (u: UserType | null) => {
    setSelectedUser(u);
    if (u) {
      markMessagesAsRead('user', u._id);
    }
    if (window.innerWidth < 768) {
      setShowSidebar(false);
      setShowChat(true);
    }
  };

  const handleBackToSidebar = () => {
    setSelectedUser(null);
    if (window.innerWidth < 768) {
      setShowSidebar(true);
      setShowChat(false);
    }
  };

  useEffect(() => {
    if (!messages.length) return;
    if (!isNearBottom) return; // Don't scroll if user is reading old messages

    const container = chatContainerRef.current;
    if (!container) return;

    // Auto-scroll to bottom for new messages
    // Add small delay to ensure DOM is updated
    setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  }, [messages, isNearBottom]);

  useEffect(() => {
    if (localVideoRef.current && localStream && callType === 'video') {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callType, isCalling]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((err) => console.log('Video play error:', err));
    }
    if (remoteAudioRef.current && remoteStream) {
      // Extract and play only audio tracks
      const audioTracks = remoteStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioOnlyStream = new MediaStream(audioTracks);
        remoteAudioRef.current.srcObject = audioOnlyStream;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.play().catch((err) => console.log('Audio play error:', err));
      }
    }
  }, [remoteStream, callType, isCalling]);

  const setupPeerConnection = (remoteUserId: string) => {
    // Reset buffer whenever we create a new peer connection.
    pendingIceCandidatesRef.current = [];
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && propSocket) {
        propSocket.emit('ice-candidate', { toUserId: remoteUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStream(stream);
      
      // Handle video track
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch((err) => console.log('Video play error:', err));
      }
      
      // Handle audio track - extract audio only for audio element
      if (remoteAudioRef.current) {
        // For audio-only calls or to ensure audio plays properly
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          // Create a new stream with just audio tracks for the audio element
          const audioOnlyStream = new MediaStream(audioTracks);
          remoteAudioRef.current.srcObject = audioOnlyStream;
          remoteAudioRef.current.play().catch((err) => console.log('Audio play error:', err));
          
          // Ensure volume is not muted
          remoteAudioRef.current.volume = 1.0;
          remoteAudioRef.current.muted = false;
        }
      }
      
      console.log('📞 Remote track received:', event.track.kind, event.track.label);
    };

    peerConnection.current = pc;
    return pc;
  };

  const videoFilterCss = useMemo(
    () => VIDEO_CALL_FILTERS.find((f) => f.id === videoCallFilterId)?.css ?? "none",
    [videoCallFilterId]
  );

  // Canvas-based filter processing - applies filter and transmits to peer
  const startCanvasProcessing = useCallback((sourceStream: MediaStream) => {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const videoTrack = sourceStream.getVideoTracks()[0];
    if (!videoTrack) return null;

    // Set canvas size to match video track settings
    const settings = videoTrack.getSettings();
    canvas.width = settings.width || 640;
    canvas.height = settings.height || 480;

    // Create a video element to draw from
    const video = document.createElement('video');
    video.srcObject = sourceStream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.play().catch(() => {});

    // Get canvas stream
    const canvasStream = canvas.captureStream(30); // 30 fps
    
    // Add audio tracks from original stream
    sourceStream.getAudioTracks().forEach(track => {
      canvasStream.addTrack(track);
    });

    // Draw loop with filter
    const drawFrame = () => {
      if (!ctx || !canvas) return;
      
      // Apply filter to canvas context
      const filter = VIDEO_CALL_FILTERS.find(f => f.id === videoCallFilterId)?.css || 'none';
      ctx.filter = filter;
      
      // Draw video frame
      ctx.save();
      ctx.scale(-1, 1); // Mirror effect
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      
      rafIdRef.current = requestAnimationFrame(drawFrame);
    };

    video.onloadedmetadata = () => {
      drawFrame();
    };

    return { canvasStream, video };
  }, [videoCallFilterId]);

  const stopCanvasProcessing = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // Handle filter changes during active call - restart canvas processing with new filter
  useEffect(() => {
    if (isCalling && callType === 'video' && localStream && videoCallFilterId !== 'none') {
      // Stop existing canvas processing
      stopCanvasProcessing();
      canvasStreamRef.current?.getTracks().forEach(track => {
        if (track.kind === 'video') track.stop();
      });
      
      // Restart with new filter
      const canvasResult = startCanvasProcessing(localStream);
      if (canvasResult && peerConnection.current) {
        canvasStreamRef.current = canvasResult.canvasStream;
        
        // Replace track in peer connection
        const senders = peerConnection.current.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        const newVideoTrack = canvasResult.canvasStream.getVideoTracks()[0];
        
        if (videoSender && newVideoTrack) {
          videoSender.replaceTrack(newVideoTrack).catch(err => {
            console.error('Error replacing video track:', err);
          });
        }
      }
    }
  }, [videoCallFilterId, isCalling, callType, localStream, startCanvasProcessing, stopCanvasProcessing]);

  // Unique Feature: Sentiment Analysis (Simple implementation)
  const analyzeSentiment = (text: string) => {
    const positive = ['happy', 'good', 'great', 'awesome', 'love', 'yes', 'cool', 'nice'];
    const negative = ['sad', 'bad', 'angry', 'hate', 'no', 'urgent', 'help', 'wrong'];
    const lower = text.toLowerCase();
    if (positive.some(word => lower.includes(word))) return '😊';
    if (negative.some(word => lower.includes(word))) return '😟';
    return '😐';
  };

  // Stable time formatting function to prevent fluctuation
  const formatMessageTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Date grouping utilities for WhatsApp-style message organization
  // Using stable reference time to prevent flickering
  const referenceTimeRef = useRef(new Date());
  
  const getDateGroup = useCallback((timestamp: string) => {
    const messageDate = new Date(timestamp);
    // Use stable reference time instead of new Date() to prevent recalculation on every render
    const now = referenceTimeRef.current;
    
    // Get date parts in local timezone for accurate comparison
    const msgYear = messageDate.getFullYear();
    const msgMonth = messageDate.getMonth();
    const msgDay = messageDate.getDate();
    
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    
    // Check if it's today
    if (msgYear === todayYear && msgMonth === todayMonth && msgDay === todayDay) {
      return 'Today';
    }
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgYear === yesterday.getFullYear() && msgMonth === yesterday.getMonth() && msgDay === yesterday.getDate()) {
      return 'Yesterday';
    }
    
    // Check if it's this week
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday of current week
    weekStart.setHours(0, 0, 0, 0);
    const msgDateOnly = new Date(msgYear, msgMonth, msgDay);
    
    if (msgDateOnly >= weekStart) {
      return 'This Week';
    }
    
    // Return formatted date for older messages
    return messageDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: msgYear !== todayYear ? 'numeric' : undefined 
    });
  }, []);

  // Group messages by date using getDateGroup - memoized to prevent recalculation
  const groupMessagesByDate = useCallback((messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const dateGroup = getDateGroup(message.timestamp);
      if (!groups[dateGroup]) {
        groups[dateGroup] = [];
      }
      groups[dateGroup].push(message);
    });
    
    return groups;
  }, [getDateGroup]);

  // ===== MODERN FEATURES HELPERS =====
  
  // Pinned chats functions
  const togglePinChat = useCallback((chatId: string) => {
    setPinnedChats(prev => {
      const newPinned = new Set(prev);
      if (newPinned.has(chatId)) {
        newPinned.delete(chatId);
      } else {
        newPinned.add(chatId);
      }
      localStorage.setItem('pinnedChats', JSON.stringify([...newPinned]));
      return newPinned;
    });
  }, []);
  
  // Voice recording functions
  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setVoiceMessageBlob(blob);
        setShowVoiceMessagePreview(true);
        stream.getTracks().forEach(track => track.stop());
      };
      
      voiceRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsVoiceRecording(true);
      
      // Start timer
      let seconds = 0;
      voiceRecordingIntervalRef.current = setInterval(() => {
        seconds++;
        setVoiceRecordingTime(seconds);
      }, 1000);
    } catch (error) {
      console.error('Error starting voice recording:', error);
      addNotification('Could not access microphone', 'error');
    }
  }, []);
  
  const stopVoiceRecording = useCallback(() => {
    if (voiceRecorderRef.current && isVoiceRecording) {
      voiceRecorderRef.current.stop();
      setIsVoiceRecording(false);
      setVoiceRecordingTime(0);
      if (voiceRecordingIntervalRef.current) {
        clearInterval(voiceRecordingIntervalRef.current);
      }
    }
  }, [isVoiceRecording]);
  
  const cancelVoiceRecording = useCallback(() => {
    if (voiceRecorderRef.current && isVoiceRecording) {
      voiceRecorderRef.current.stop();
    }
    setIsVoiceRecording(false);
    setVoiceRecordingTime(0);
    setVoiceMessageBlob(null);
    setShowVoiceMessagePreview(false);
    if (voiceRecordingIntervalRef.current) {
      clearInterval(voiceRecordingIntervalRef.current);
    }
  }, [isVoiceRecording]);
  
  // Media preview functions
  const handleMediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('video/') ? 'video' : 'file';
    
    setMediaPreview({ type, url, file });
    setShowMediaPreview(true);
  }, []);
  
  const clearMediaPreview = useCallback(() => {
    if (mediaPreview?.url) {
      URL.revokeObjectURL(mediaPreview.url);
    }
    setMediaPreview(null);
    setShowMediaPreview(false);
  }, [mediaPreview]);
  
  // Helper to get filtered messages for current chat
  const getFilteredMessages = useCallback(() => {
    return messages.filter(msg => {
      if (msg.deletedFor && msg.deletedFor.includes(user?._id || '')) return false;
      if (activeFeed === 'reels') return false;
      if (msg.isSystem) return true;
      
      // Group Chat
      if (selectedGroup) {
        return String(msg.groupId) === String(selectedGroup._id);
      }
      
      // AI Chat
      if (activeTab === 'ai') {
        return (msg.user === user?.name && msg.to === 'My Assistant') || 
               (msg.user === 'My Assistant' && msg.to === user?.name);
      }

      // Blind Chat
      if (activeTab === 'blind') {
        return msg.isBlind === true;
      }

      // Private Chat
      if (selectedUser) {
        return (msg.user === user?.name && msg.to === selectedUser.name) || 
               (msg.user === selectedUser.name && msg.to === user?.name) ||
               (msg.isAI && msg.to === selectedUser.name);
      }

      // Global Chat (no 'to' and no 'groupId')
      return !msg.to && !msg.groupId && !msg.isBlind;
    });
  }, [messages, selectedGroup, selectedUser, activeTab, activeFeed, user?._id, user?.name]);

  // Chat search functions
  const searchInChat = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }
    
    const filteredMsgs = getFilteredMessages();
    const indices: number[] = [];
    filteredMsgs.forEach((msg, idx) => {
      if (msg.text?.toLowerCase().includes(query.toLowerCase())) {
        indices.push(idx);
      }
    });
    setSearchResults(indices);
    setCurrentSearchIndex(indices.length > 0 ? 0 : -1);
    
    // Auto-scroll to first result
    if (indices.length > 0) {
      const targetMsg = filteredMsgs[indices[0]];
      if (targetMsg?.id) {
        setTimeout(() => {
          const msgElement = document.getElementById(`msg-${targetMsg.id}`);
          if (msgElement) {
            msgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            msgElement.classList.add('search-highlight-pulse');
            setTimeout(() => msgElement.classList.remove('search-highlight-pulse'), 2000);
          }
        }, 100);
      }
    }
  }, [getFilteredMessages]);
  
  const navigateSearchResult = useCallback((direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    setCurrentSearchIndex(newIndex);
    
    // Get the message at the new index and scroll to it
    const msgIndex = searchResults[newIndex];
    const filteredMsgs = getFilteredMessages();
    const targetMsg = filteredMsgs[msgIndex];
    
    if (targetMsg?.id) {
      setTimeout(() => {
        const msgElement = document.getElementById(`msg-${targetMsg.id}`);
        if (msgElement) {
          msgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight effect
          msgElement.classList.add('search-highlight-pulse');
          setTimeout(() => msgElement.classList.remove('search-highlight-pulse'), 2000);
        }
      }, 100);
    }
  }, [searchResults, currentSearchIndex]);
  
  // Update last messages for sidebar
  const updateLastMessage = useCallback((chatId: string, text: string, timestamp: string, isMe: boolean) => {
    setLastMessages(prev => {
      const newMap = new Map(prev);
      newMap.set(chatId, { text, timestamp, isMe });
      return newMap;
    });
  }, []);

  // Optimized date grouping with useMemo for performance
  const groupedChatData = useMemo(() => {
    // Filter messages based on current chat context
    const filteredMessages = messages.filter(msg => {
      if (msg.deletedFor && msg.deletedFor.includes(user?._id || '')) return false;
      if (activeFeed === 'reels') return false;
      if (msg.isSystem) return true;
      
      // Group Chat
      if (selectedGroup) {
        return String(msg.groupId) === String(selectedGroup._id);
      }
      
      // AI Chat
      if (activeTab === 'ai') {
        return (msg.user === user?.name && msg.to === 'My Assistant') || 
               (msg.user === 'My Assistant' && msg.to === user?.name);
      }

      // Blind Chat
      if (activeTab === 'blind') {
        return msg.isBlind === true;
      }

      // Private Chat
      if (selectedUser) {
        return (msg.user === user?.name && msg.to === selectedUser.name) || 
               (msg.user === selectedUser.name && msg.to === user?.name) ||
               (msg.isAI && msg.to === selectedUser.name);
      }

      // Global Chat (no 'to' and no 'groupId')
      return !msg.to && !msg.groupId && !msg.isBlind;
    });

    // Separate system messages and regular messages
    const systemMessages = filteredMessages.filter(msg => msg.isSystem);
    const regularMessages = filteredMessages.filter(msg => !msg.isSystem)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Group regular messages by date
    const groupedMessages = groupMessagesByDate(regularMessages);
    const dateGroups = Object.entries(groupedMessages).sort((a, b) => {
      // Sort date groups: older dates first, then This Week, Yesterday, Today at bottom
      const order = ['Today', 'Yesterday', 'This Week'];
      const aIndex = order.indexOf(a[0]);
      const bIndex = order.indexOf(b[0]);
      
      if (aIndex !== -1 && bIndex !== -1) return bIndex - aIndex;
      if (aIndex !== -1) return 1;
      if (bIndex !== -1) return -1;
      
      // For specific dates, sort chronologically (oldest first)
      return new Date(a[1][0].timestamp).getTime() - new Date(b[1][0].timestamp).getTime();
    });

    return { systemMessages, dateGroups };
  }, [messages, selectedGroup, selectedUser, activeTab, activeFeed, user?._id, user?.name, groupMessagesByDate]);

  const getUnreadMessages = (messages: Message[]) => {
    return messages.filter(msg => !msg.read && msg.senderId !== user?._id);
  };

  const summarizeMessages = (messages: Message[], maxLength: number = 50) => {
    if (messages.length === 0) return '';
    
    const textMessages = messages.filter(msg => msg.text && !msg.isSystem && !msg.isAI);
    if (textMessages.length === 0) return `${messages.length} media messages`;
    
    const firstMessage = textMessages[0].text;
    if (firstMessage.length <= maxLength) {
      return firstMessage;
    }
    
    return firstMessage.substring(0, maxLength) + '...';
  };

  // Enhanced Date separator component with advanced glassmorphism
  const DateSeparator = ({ date, unreadCount }: { 
    date: string; 
    unreadCount?: number; 
  }) => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="flex items-center justify-center gap-4 my-8 relative"
    >
      {/* Animated gradient lines */}
      <div className={cn(
        "h-px flex-1 bg-gradient-to-r",
        isDarkMode 
          ? "from-transparent via-emerald-500/30 to-slate-700" 
          : "from-transparent via-emerald-400/40 to-slate-300"
      )} />
      
      {/* Glassmorphism date badge */}
      <motion.div 
        whileHover={{ scale: 1.05, y: -2 }}
        className={cn(
          "flex items-center gap-3 px-5 py-2.5 rounded-2xl shadow-xl border backdrop-blur-xl",
          isDarkMode 
            ? "bg-gradient-to-r from-slate-800/90 via-slate-700/80 to-slate-800/90 border-emerald-500/30 shadow-emerald-500/10" 
            : "bg-gradient-to-r from-white/90 via-emerald-50/80 to-white/90 border-emerald-400/40 shadow-emerald-500/15"
        )}
      >
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-emerald-500"
        />
        <span className={cn(
          "text-[11px] font-black uppercase tracking-widest",
          isDarkMode ? "text-emerald-400" : "text-emerald-600"
        )}>
          {date}
        </span>
        {unreadCount && unreadCount > 0 && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full">
            {unreadCount} new
          </span>
        )}
      </motion.div>
      
      <div className={cn(
        "h-px flex-1 bg-gradient-to-l",
        isDarkMode 
          ? "from-transparent via-emerald-500/30 to-slate-700" 
          : "from-transparent via-emerald-400/40 to-slate-300"
      )} />
    </motion.div>
  );

  // Advanced message animation variants
  const messageAnimVariants = {
    initial: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95,
      rotateX: -5 
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 0.8
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      transition: { duration: 0.2 }
    }
  };

  const handleDeleteForMe = (id: string) => {
    if (!user) return;
    if (window.confirm("Delete this message for yourself?")) {
      propSocket?.emit('delete_for_me', { id, userId: user._id });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedFor: [...(m.deletedFor || []), user._id] } : m));
      // Track deleted message in localStorage
      const deletedMessages = JSON.parse(localStorage.getItem('deletedMessages') || '[]');
      if (!deletedMessages.includes(id)) {
        deletedMessages.push(id);
        localStorage.setItem('deletedMessages', JSON.stringify(deletedMessages));
      }
    }
  };

  const handleDeleteForEveryone = (id: string) => {
    if (!user) return;
    if (window.confirm("Delete this message for everyone?")) {
      propSocket?.emit('delete_for_everyone', { id });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true, text: '🚫 This message was deleted' } : m));
      // Track deleted message in localStorage
      const deletedMessages = JSON.parse(localStorage.getItem('deletedMessages') || '[]');
      if (!deletedMessages.includes(id)) {
        deletedMessages.push(id);
        localStorage.setItem('deletedMessages', JSON.stringify(deletedMessages));
      }
    }
  };

  const handleDeleteAllMessages = async () => {
    if (!user) return;
    if (window.confirm("Are you sure you want to clear this chat? It will only be deleted for you.")) {
      try {
        const body: any = { userId: user._id, userName: user?.name || '' };
        if (selectedGroup) {
          body.groupId = selectedGroup._id;
        } else if (selectedUser) {
          body.otherUserName = selectedUser.name;
        } else if (activeTab === 'blind') {
          body.isBlind = true;
        } else if (activeTab === 'all') {
          body.isGlobal = true;
        } else {
          return;
        }

        const response = await fetch('/api/messages/clear', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        if (response.ok) {
          // Get IDs of messages to be deleted
          const deletedMessageIds = JSON.parse(localStorage.getItem('deletedMessages') || '[]');
          const messagesToDelete: string[] = [];
          // Update local state to hide these messages
          setMessages(prev => {
            prev.forEach(m => {
              let shouldDelete = false;
              if (selectedGroup && m.groupId === selectedGroup._id) {
                shouldDelete = true;
              }
              if (selectedUser && ((m.user === user?.name && m.to === selectedUser.name) || (m.user === selectedUser.name && m.to === user?.name))) {
                shouldDelete = true;
              }
              if (activeTab === 'blind' && m.isBlind) {
                shouldDelete = true;
              }
              if (activeTab === 'all' && !m.groupId && !m.to && !m.isBlind) {
                shouldDelete = true;
              }
              if (shouldDelete && m.id && !deletedMessageIds.includes(m.id)) {
                messagesToDelete.push(m.id);
              }
            });
            return prev.map(m => {
              if (selectedGroup && m.groupId === selectedGroup._id) {
                return { ...m, deletedFor: [...(m.deletedFor || []), user._id] };
              }
              if (selectedUser && ((m.user === user?.name && m.to === selectedUser.name) || (m.user === selectedUser.name && m.to === user?.name))) {
                return { ...m, deletedFor: [...(m.deletedFor || []), user._id] };
              }
              if (activeTab === 'blind' && m.isBlind) {
                return { ...m, deletedFor: [...(m.deletedFor || []), user._id] };
              }
              if (activeTab === 'all' && !m.groupId && !m.to && !m.isBlind) {
                return { ...m, deletedFor: [...(m.deletedFor || []), user._id] };
              }
              return m;
            });
          });
          // Save deleted message IDs to localStorage
          if (messagesToDelete.length > 0) {
            const updatedDeletedIds = [...deletedMessageIds, ...messagesToDelete];
            localStorage.setItem('deletedMessages', JSON.stringify(updatedDeletedIds));
          }
        } else {
          alert("Failed to clear chat from server.");
        }
      } catch (error) {
        console.error("Error clearing chat:", error);
        alert("An error occurred while clearing chat.");
      }
    }
  };

  // Function to render message text with clickable reel links
  const renderMessageText = (msg: Message, isMe?: boolean) => {
    const originalMessage = msg.isDeleted ? "" : msg.text || "";
    
    // For translated messages:
    // - Sender (isMe=true) sees originalText with translation below
    // - Receiver sees translated text with original below (if available)
    let displayedText: string;
    let showTranslation: boolean = false;
    let translationText: string = "";
    
    if (msg.translatedText && msg.originalText) {
      showTranslation = true;
      if (isMe) {
        // Sender sees their original message with translation below
        displayedText = msg.originalText;
        translationText = msg.translatedText;
      } else {
        // Receiver sees translated text with original below
        displayedText = msg.translatedText;
        translationText = msg.originalText;
      }
    } else if (msg.translatedText) {
      // Only translation available (incoming messages)
      displayedText = msg.translatedText;
      if (!isMe && msg.text && msg.text !== msg.translatedText) {
        showTranslation = true;
        translationText = msg.text;
      }
    } else {
      // No translation, show original
      displayedText = originalMessage;
    }

    // Debug translation values
    if (msg.translatedText || msg.originalText) {
      console.log('[renderMessageText] msg.id:', msg.id, 'isMe:', isMe, 'text:', msg.text?.slice(0, 20), 'translatedText:', msg.translatedText?.slice(0, 20), 'originalText:', msg.originalText?.slice(0, 20), 'displayed:', displayedText?.slice(0, 20));
    }

    // Check if this is a shared reel message (by reelId or reelData)
    if (msg.reelId || msg.reelData) {
      const caption = msg.reelData?.caption || "Shared Reel";

      return (
        <div className="space-y-2">
          <p className={cn(
            "text-base md:text-lg leading-relaxed font-bold tracking-tight whitespace-pre-wrap transition-all duration-500",
            msg.isDeleted ? "italic text-slate-400" : ""
          )}>
            <span className="inline-flex items-center gap-2">
              
              <span className="text-emerald-500 font-black">Reel:</span>
              <button
                onClick={() => {
                  if (msg.reelData) {
                    handleSharedReelClick(msg.reelData);
                  } else {
                    // Fallback for older reel messages
                    setActiveFeed('reels');
                    setActiveTab('all');
                    setShowSidebar(false);
                    if (window.innerWidth < 768) setShowChat(false);
                    showBrowserNotification('', 'View shared reels in the reels section', 'info');
                  }
                }}
                className={cn(
                  "underline decoration-emerald-500/50 decoration-2 underline-offset-2 transition-all hover:decoration-emerald-500",
                  isDarkMode ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-600 hover:text-emerald-700"
                )}
              >
                {caption}
              </button>
            </span>
          </p>
          <div className={cn(
            "text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2",
            isDarkMode ? "text-slate-400" : "text-slate-600"
          )}>
            <Camera className="w-3 h-3" />
            Click to view in reels feed
          </div>
        </div>
      );
    }
    
    // Regular message text
    return (
      <div className="space-y-2">
        <p className={cn(
          "text-base md:text-lg leading-relaxed font-bold tracking-tight whitespace-pre-wrap transition-all duration-500",
          msg.isDeleted ? "italic text-slate-400" : ""
        )}>
          {displayedText}
        </p>
        
        {/* Show translation if available */}
        {showTranslation && translationText && (
          <div className={cn(
            "text-sm opacity-75 italic border-t pt-2 mt-2",
            isDarkMode ? "border-slate-600 text-slate-300" : "border-slate-300 text-slate-600"
          )}>
            <span className="text-xs font-semibold uppercase tracking-wide opacity-60">
              {isMe ? "🌐 Translated:" : "🌐 Original:"}
            </span>
            <p className="mt-1 leading-relaxed">
              {translationText}
            </p>
          </div>
        )}
      </div>
    );
  };

  const handleEditMessage = (message: Message) => {
    if (!user) return;
    setEditingMessage(message);
    setInputMessage(message.text);
  };

  const handleForwardMessage = (message: Message) => {
    if (!user) return;
    setMessageToForward(message);
    setShowForwardModal(true);
  };

  const handleForwardConfirm = async (selectedUsers: string[], selectedGroups: string[], message: Message) => {
    if (!user || !propSocket) return;
    
    console.log('Forwarding message:', {
      originalMessage: message,
      from: user.name,
      fromId: user._id,
      selectedUsers,
      selectedGroups
    });
    
    try {
      propSocket.emit('forward_message', {
        originalMessage: message,
        from: user.name,
        fromId: user._id,
        selectedUsers,
        selectedGroups
      });
      
      console.log('Forward message emitted successfully');
      // Show success notification
      addNotification('Message forwarded successfully!', 'success');
    } catch (error) {
      console.error('Error forwarding message:', error);
      addNotification('Failed to forward message', 'error');
    }
  };

  // Scheduled message handlers
  const handleScheduleMessage = async () => {
    console.log('🚀 handleScheduleMessage called:', {
      hasUser: !!user,
      hasSocket: !!propSocket,
      hasInput: !!inputMessage.trim(),
      scheduledSendTime
    });

    if (!user || !propSocket || !inputMessage.trim()) {
      console.log('❌ Cannot schedule - missing user, propSocket, or input');
      return;
    }
    if (!scheduledSendTime) {
      alert('Please select a date and time for scheduling');
      return;
    }

    // Parse the local datetime string properly
    const [datePart, timePart] = scheduledSendTime.split('T');
    if (!datePart || !timePart) {
      alert('Please choose a valid date and time for scheduling');
      return;
    }
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Create date in local timezone
    const scheduledDateTime = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();
    
    // Add 1 minute buffer for validation
    const minAllowedTime = new Date(now.getTime() - 60000);
    
    if (Number.isNaN(scheduledDateTime.getTime()) || scheduledDateTime <= minAllowedTime) {
      alert('Scheduled time must be a valid future date and time');
      return;
    }

    const messageId = Math.random().toString(36).substr(2, 9);
    const chatId = selectedGroup?._id || selectedUser?._id || 'global';
    
    // Create optimistic scheduled message to show immediately
    const optimisticScheduledMsg: Message = {
      id: messageId,
      user: user.name,
      senderId: user._id,
      to: selectedUser?.name,
      groupId: selectedGroup?._id,
      text: inputMessage,
      timestamp: new Date().toISOString(),
      scheduledTime: scheduledDateTime.toISOString(),
      isScheduled: true,
      status: 'scheduled',
      readBy: [],
      deliveredAt: undefined,
      sender: undefined
    };
    
    // Add to chat immediately so user sees it
    setMessages(prev => [...prev, optimisticScheduledMsg]);
    setScheduledMessages(prev => [optimisticScheduledMsg, ...prev]);
    
    // Only auto-scroll if user is near bottom
    if (isNearBottom) {
      setTimeout(() => {
        const container = document.getElementById('messages-container');
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    }

    // Clear input immediately
    setInputMessage('');
    setScheduledSendTime('');
    
    try {
      console.log('📅 Sending schedule request to API...');
      const response = await fetch('/api/message/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          user: user.name,
          senderId: user._id,
          to: selectedGroup ? undefined : selectedUser?.name,
          groupId: selectedGroup?._id,
          text: inputMessage,
          scheduledTime: scheduledDateTime.toISOString(),
          profilePic: profilePic || undefined,
          isRecurring,
          recurringType: isRecurring ? recurringType : undefined,
          recurringDays: isRecurring && recurringType === 'custom' ? recurringDays : undefined
        })
      });

      console.log('📅 API response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Message scheduled:', result);
        
        // Update with server data
        const scheduledMsg: Message = {
          id: result.message.id,
          user: user.name,
          senderId: user._id,
          to: selectedUser?.name,
          groupId: selectedGroup?._id,
          text: inputMessage,
          timestamp: new Date().toISOString(),
          scheduledTime: result.message.scheduledTime,
          isScheduled: true,
          status: 'scheduled',
          readBy: [],
          deliveredAt: undefined,
          sender: undefined
        };
        
        setScheduledMessages(prev => prev.map(m => m.id === messageId ? scheduledMsg : m));
        setMessages(prev => prev.map(m => m.id === messageId ? scheduledMsg : m));
        setIsRecurring(false);
        setRecurringType('daily');
        setRecurringDays([]);

        const repeatText = isRecurring ? ` (Repeats ${recurringType === 'custom' ? `on ${recurringDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}` : recurringType})` : '';
        addNotification(`📅 Message scheduled for ${scheduledDateTime.toLocaleString()}${repeatText}`, 'success');
      } else {
        const error = await response.json();
        console.error('❌ Schedule API error:', error);
        alert(error.error || 'Failed to schedule message');
        // Remove the optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== messageId));
        setScheduledMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('❌ Error scheduling message:', error);
      alert('Failed to schedule message. Please try again.');
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setScheduledMessages(prev => prev.filter(m => m.id !== messageId));
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || newGroupMembers.length === 0) return;
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          members: [...newGroupMembers, user._id],
          admin: user._id
        })
      });
      if (response.ok) {
        const newGroup = await response.json();
        setGroups(prev => {
          const updated = [...prev, newGroup];
          localStorage.setItem('userGroups', JSON.stringify(updated));
          return updated;
        });
        setShowNewGroupModal(false);
        setNewGroupName('');
        setNewGroupMembers([]);
      }
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const addMemberToGroup = async (userId: string) => {
    if (!selectedGroup) return;
    try {
      const response = await fetch(`/api/groups/${selectedGroup._id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (response.ok) {
        const updatedGroup = await response.json();
        setGroups(prev => {
          const updated = prev.map(g => g._id === updatedGroup._id ? updatedGroup : g);
          localStorage.setItem('userGroups', JSON.stringify(updated));
          return updated;
        });
        setSelectedGroup(updatedGroup);
        setShowAddMemberModal(false);
      }
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };

  const handleExitGroup = async (groupId: string) => {
    if (!window.confirm("Are you sure you want to exit this group?")) return;
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${user._id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setGroups(prev => prev.filter(g => g._id !== groupId));
        setSelectedGroup(null);
        setShowGroupInfo(false);
        alert("You have left the group.");
      }
    } catch (error) {
      console.error("Error exiting group:", error);
    }
  };

  const handleGroupDPUpload = async () => {
    if (!groupDPUpload || !selectedGroup) return;
    
    setIsUploadingGroupDP(true);
    const formData = new FormData();
    formData.append('groupDP', groupDPUpload);
    
    try {
      const response = await fetch(`/api/groups/${selectedGroup._id}/dp`, {
        method: 'PUT',
        body: formData
      });
      
      if (response.ok) {
        const updatedGroup = await response.json();
        setGroups(prev => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g));
        setSelectedGroup(updatedGroup);
        setGroupDPUpload(null);
        alert("Group DP updated successfully!");
      }
    } catch (error) {
      console.error("Error uploading group DP:", error);
      alert("Failed to upload group DP.");
    } finally {
      setIsUploadingGroupDP(false);
    }
  };

  const sendFriendRequest = async (toUserId: string) => {
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: user._id, to: toUserId })
      });
      if (response.ok) {
        alert("Friend request sent!");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to send request");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const respondToFriendRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status })
      });
      if (response.ok) {
        setFriendRequests(prev => prev.filter(r => r._id !== requestId));
        if (status === 'accepted') {
          showBrowserNotification('Friend Request Accepted', `You are now friends!`);
          // Refresh friends list
          const friendsRes = await fetch(`/api/friends/${user._id}`);
          if (friendsRes.ok) {
            const friendsData = await friendsRes.json();
            setFriends(friendsData);
            localStorage.setItem('friends', JSON.stringify(friendsData));
          }
        }
      }
    } catch (error) {
      console.error("Error responding to friend request:", error);
    }
  };

  const cancelFriendRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/friends/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      if (response.ok) {
        // Move to cancelled requests instead of deleting
        const requestToCancel = sentFriendRequests.find(r => r._id === requestId);
        if (requestToCancel) {
          setSentFriendRequests(prev => prev.filter(r => r._id !== requestId));
          setCancelledRequests(prev => [...prev, { ...requestToCancel, cancelledAt: new Date().toISOString() }]);
        }
        showBrowserNotification('Friend Request Cancelled', 'Friend request has been cancelled');
      }
    } catch (error) {
      console.error("Error cancelling friend request:", error);
    }
  };

  const restoreFriendRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/friends/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      if (response.ok) {
        // Move back to sent requests
        const requestToRestore = cancelledRequests.find(r => r._id === requestId);
        if (requestToRestore) {
          setCancelledRequests(prev => prev.filter(r => r._id !== requestId));
          setSentFriendRequests(prev => [...prev, requestToRestore]);
        }
        showBrowserNotification('Friend Request Restored', 'Friend request has been sent again');
      }
    } catch (error) {
      console.error("Error restoring friend request:", error);
    }
  };

  const requestVerification = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/users/request-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      });
      
      if (response.ok) {
        showBrowserNotification('📋 Request Sent', 'Verification request submitted successfully!', 'success');
        propSocket?.emit('verification_request', { 
          userId: user._id, 
          userName: user?.name 
        });
      } else {
        const data = await response.json();
        showBrowserNotification('❌ Request Failed', data.message || 'Failed to request verification', 'error');
      }
    } catch (error) {
      console.error('Error requesting verification:', error);
      showBrowserNotification('❌ Error', 'Failed to request verification', 'error');
    }
  };

  const verifyUser = async (targetUserId: string, targetUserName: string) => {
    try {
      const response = await fetch('/api/users/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminId: user._id,
          targetUserId,
          verified: true 
        })
      });
      
      if (response.ok) {
        showBrowserNotification('✅ User Verified', `${targetUserName} has been verified!`, 'success');
        setVerifiedUsers(prev => new Set(prev).add(targetUserId));
        propSocket?.emit('user_verified', { 
          userId: targetUserId, 
          userName: targetUserName 
        });
      } else {
        const data = await response.json();
        showBrowserNotification('❌ Verification Failed', data.message || 'Failed to verify user', 'error');
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      showBrowserNotification('❌ Error', 'Failed to verify user', 'error');
    }
  };

  const testVerification = () => {
    // Test: Send verification request (like a user would)
    requestVerification();
  };

  const verifyEntity = (entityName: string) => {
    // First try to find user
    const targetUser = allUsers.find(u => u.name.toLowerCase() === entityName.toLowerCase());
    if (targetUser) {
      setVerifiedUsers(prev => new Set(prev).add(targetUser._id));
      showBrowserNotification('✅ User Verified', `${targetUser.name} is now verified!`, 'success');
      propSocket?.emit('user_verified', {
        userId: targetUser._id,
        userName: targetUser.name
      });
      return;
    }
    
    // If not a user, try to find group
    const targetGroup = groups.find(g => g.name.toLowerCase() === entityName.toLowerCase());
    if (targetGroup) {
      setGroups(prev => prev.map(g => 
        g._id === targetGroup._id ? { ...g, isVerified: true } : g
      ));
      showBrowserNotification('✅ Group Verified', `${targetGroup.name} is now verified!`, 'success');
      propSocket?.emit('group_verified', {
        groupId: targetGroup._id,
        groupName: targetGroup.name
      });
      return;
    }
    
    // If neither found
    showBrowserNotification('❌ Not Found', `${entityName} not found in users or groups`, 'error');
  };

  const testAdminVerification = () => {
    // Test: Admin approves verification (for testing only)
    if (user) {
      setUser({ ...user, isVerified: true });
      setVerifiedUsers(prev => new Set(prev).add(user._id));
      showBrowserNotification('✅ Admin Verified', 'Account verified by admin (Test)', 'success');
    }
  };

  const sendFriendRequestBySearch = async () => {
    if (!searchFriendInput.trim()) return;
    setIsSearchingFriend(true);
    try {
      // Find user by name or email/ID
      const response = await fetch(`/api/users/search?query=${searchFriendInput}`);
      if (response.ok) {
        const foundUsers = await response.json();
        const targetUser = foundUsers.find((u: UserType) => u.name.toLowerCase() === searchFriendInput.toLowerCase() || u._id === searchFriendInput);
        
        if (targetUser) {
          if (targetUser._id === user._id) {
            alert("You cannot add yourself as a friend!");
            return;
          }
          await sendFriendRequest(targetUser._id);
          setSearchFriendInput('');
        } else {
          alert("User not found. Please check the name or ID.");
        }
      }
    } catch (error) {
      console.error("Error searching for friend:", error);
      alert("Failed to search for user. Please try again.");
    } finally {
      setIsSearchingFriend(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    console.log('🚀 handleSendMessage called:', { 
      hasUser: !!user, 
      hasSocket: !!propSocket, 
      hasInput: !!inputMessage.trim(),
      isSocketConnected: isSocketConnected,
      propSocketId: propSocket?.id,
      activeTab,
      selectedUser: selectedUser?.name,
      selectedGroup: selectedGroup?.name
    });
    
    if (!user || !propSocket) {
      console.log('❌ Cannot send message - missing user or propSocket');
      alert('Connection issue: Please refresh the page and try again.');
      return;
    }
    e?.preventDefault();
    if (!inputMessage.trim()) return;

    // Spam detection
    const isSpam = detectSpam(inputMessage.trim(), user._id);
    if (isSpam) {
      // Add user to spam list
      setSpamUsers(prev => new Set([...prev, user._id]));
      
      // Show warning notification
      addNotification('⚠️ Spam detected! Message blocked.', 'error');
      
      // Disable input temporarily
      setInputMessage('');
      return;
    }

    const messageId = Math.random().toString(36).substr(2, 9);
    let messageToSend = inputMessage;
    let originalTextForStorage: string | undefined;

    // Handle outgoing message translation
    if (isPreviewMode && originalInputText) {
      messageToSend = inputMessage; // Already translated
      originalTextForStorage = originalInputText; // Store original for reference
      console.log("[Send Message] Using preview-translated message:", { 
        original: originalInputText.slice(0, 30), 
        translated: messageToSend.slice(0, 30) 
      });
    } else if (isOutgoingTranslationEnabled && !isTranslatingOutgoing) {
      // Auto-translate on send if enabled but not previewed
      try {
        console.log("[Send Message] Auto-translating on send...");
        const translatedText = await translateOutgoingMessage(inputMessage, outgoingTargetLang);
        messageToSend = translatedText;
        originalTextForStorage = inputMessage; // Store original text for reference
        console.log("[Send Message] Translation completed:", { original: inputMessage.slice(0, 30), translated: translatedText.slice(0, 30) });
      } catch (error) {
        console.error('Translation failed, sending original message:', error);
        // Continue with original message if translation fails
      }
    }

    if (scheduledSendTime) {
      // Parse the local datetime string properly
      const [datePart, timePart] = scheduledSendTime.split('T');
      if (!datePart || !timePart) {
        alert('Please choose a valid date and time to schedule this message.');
        return;
      }
      
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      
      // Create date in local timezone
      const scheduledDate = new Date(year, month - 1, day, hours, minutes);
      const now = new Date();
      
      // Add 1 minute buffer for validation
      const minAllowedTime = new Date(now.getTime() - 60000);
      
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= minAllowedTime) {
        alert('Please choose a future date and time to schedule this message.');
        return;
      }

      if (!selectedUser && !selectedGroup) {
        alert('Select a friend or group chat before scheduling a message.');
        return;
      }

      setIsScheduling(true);
      console.log('📅 Scheduling message:', {
        text: inputMessage,
        scheduledTime: scheduledDate.toISOString(),
        to: selectedUser?.name,
        groupId: selectedGroup?._id,
        isRecurring,
        recurringType
      });

      // Create optimistic scheduled message to show immediately
      const optimisticScheduledMsg = {
        id: messageId,
        user: activeTab === 'blind' ? 'Anonymous' : user.name,
        senderId: user._id,
        to: activeTab === 'blind' ? undefined : (selectedGroup ? undefined : (selectedUser?.name || undefined)),
        groupId: activeTab === 'blind' ? undefined : selectedGroup?._id,
        text: messageToSend,
        originalText: originalTextForStorage,
        timestamp: new Date().toISOString(),
        profilePic: activeTab === 'blind' ? undefined : (profilePic || undefined),
        isGhost: isGhostMode,
        isBlind: activeTab === 'blind',
        isAI: activeTab === 'ai',
        isEdited: false,
        isDeleted: false,
        isScheduled: true,
        status: 'scheduled' as const,
        scheduledTime: scheduledDate.toISOString(),
        sentiment: analyzeSentiment(messageToSend),
        translatedText: originalTextForStorage ? messageToSend : undefined,
        deliveredAt: undefined
      };

      // Add to chat immediately so user sees it
      setMessages(prev => [...prev, optimisticScheduledMsg]);
      setScheduledMessages(prev => [optimisticScheduledMsg, ...prev]);

      // Only auto-scroll if user is near bottom
      if (isNearBottom) {
        setTimeout(() => {
          const container = document.getElementById('messages-container');
          if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          }
        }, 100);
      }

      // Clear input immediately
      setInputMessage('');
      setScheduledSendTime('');

      try {
        const response = await fetch('/api/message/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: messageId,
            user: user.name,
            senderId: user._id,
            to: selectedGroup ? undefined : selectedUser?.name,
            groupId: selectedGroup ? selectedGroup._id : undefined,
            text: messageToSend,
            originalText: originalTextForStorage,
            image: undefined,
            video: undefined,
            audio: undefined,
            profilePic: profilePic || undefined,
            scheduledTime: scheduledDate.toISOString(),
            isBlind: activeTab === 'blind',
            isGhost: isGhostMode,
            isRecurring,
            recurringType: isRecurring ? recurringType : undefined,
            recurringDays: isRecurring && recurringType === 'custom' ? recurringDays : undefined
          })
        });

        const data = await response.json();
        console.log('📅 Schedule API response:', data);

        if (!response.ok) {
          console.error('❌ Schedule API error:', data);
          addNotification(data.error || 'Failed to schedule message.', 'error');
          // Remove the optimistic message on error
          setMessages(prev => prev.filter(m => m.id !== messageId));
          setScheduledMessages(prev => prev.filter(m => m.id !== messageId));
          return;
        }

        if (data.warning) {
          console.warn('⚠️ Schedule warning:', data.warning);
          addNotification('⚠️ ' + data.warning, 'warning');
        }

        // Update with server data
        const scheduledMessage = {
          ...data.message,
          scheduledTime: data.message.scheduledTime,
          status: data.message.status
        };

        console.log('✅ Message scheduled successfully:', scheduledMessage);
        setScheduledMessages(prev => prev.map(m => m.id === messageId ? scheduledMessage : m));
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, ...scheduledMessage } : m));
        setIsRecurring(false);
        setRecurringType('daily');
        setRecurringDays([]);

        const repeatText = isRecurring ? ` (Repeats ${recurringType === 'custom' ? `on ${recurringDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}` : recurringType})` : '';
        addNotification(`📅 Message scheduled for ${scheduledDate.toLocaleString()}${repeatText}`, 'success');
      } catch (scheduleError) {
        console.error('Schedule send error:', scheduleError);
        addNotification('Unable to schedule the message. Please try again.', 'error');
      } finally {
        setIsScheduling(false);
      }
      return;
    }

    if (editingMessage) {
      const editedMsg: Message = {
        ...editingMessage,
        text: inputMessage,
        isEdited: true,
        editedAt: new Date().toISOString()
      };
      propSocket.emit('edit_message', editedMsg);
      setMessages(prev => prev.map(m => m.id === editedMsg.id ? editedMsg : m));
      // Save edited message to localStorage for persistence
      const editedMessages = JSON.parse(localStorage.getItem('editedMessages') || '{}');
      editedMessages[editedMsg.id] = { text: inputMessage, editedAt: editedMsg.editedAt };
      localStorage.setItem('editedMessages', JSON.stringify(editedMessages));
      setEditingMessage(null);
      setInputMessage('');
      playSound(SEND_SOUND);
      return;
    }

    const messageData: Message = {
      id: messageId,
      user: activeTab === 'blind' ? 'Anonymous' : user.name,
      senderId: user._id,
      to: activeTab === 'blind' ? undefined : (selectedGroup ? undefined : (selectedUser?.name || (activeTab === 'ai' ? 'My Assistant' : undefined))),
      groupId: activeTab === 'blind' ? undefined : selectedGroup?._id,
      text: messageToSend,
      originalText: originalTextForStorage,
      timestamp: new Date().toISOString(),
      profilePic: activeTab === 'blind' ? undefined : (profilePic || undefined),
      isGhost: isGhostMode,
      isBlind: activeTab === 'blind',
      isAI: activeTab === 'ai',
      isEdited: false,
      isDeleted: false,
      status: 'sent',
      sentiment: analyzeSentiment(messageToSend),
      translatedText: originalTextForStorage ? messageToSend : undefined,
      deliveredAt: undefined,
      sender: undefined
    };
    setMessages(prev => [...prev, messageData]);

    const chatUsers = selectedGroup 
      ? selectedGroup.members.map(m => ({ _id: m._id }))
      : selectedUser 
        ? [{ _id: selectedUser._id }, { _id: user._id }]
        : [{ _id: 'all' }];

    const propSocketData = {
      id: messageId,
      sender: { _id: user._id, name: user.name, pic: profilePic },
      to: messageData.to,
      recipientId: selectedUser?._id, // Add recipient ID for reliable delivery
      toUserId: selectedUser?._id, // Backup field for compatibility
      groupId: messageData.groupId,
      // Send both legacy + new fields so server can always pick up text
      content: messageToSend,
      text: messageToSend,
      originalText: originalTextForStorage,
      translatedText: originalTextForStorage ? messageToSend : undefined,
      translateTargetLang: isOutgoingTranslationEnabled ? outgoingTargetLang : undefined,
      isGhost: isGhostMode,
      isAI: activeTab === 'ai',
      isBlind: activeTab === 'blind',
      chat: { users: chatUsers }
    };

    console.log('📡 Emitting propSocket message:', propSocketData);
    console.log('📡 Socket connected:', propSocket?.connected);
    console.log('📡 Selected user:', selectedUser?.name, 'ID:', selectedUser?._id);
    console.log('📡 Selected group:', selectedGroup?.name, 'ID:', selectedGroup?._id);
    
    // Emit message immediately - fire and forget for speed
    propSocket.emit('new message', propSocketData);
    console.log('✅ Message emitted successfully');
    
    // Only auto-scroll if user is near bottom
    if (isNearBottom) {
      requestAnimationFrame(() => {
        const container = chatContainerRef.current;
        const messagesContainer = document.getElementById('messages-container');
        const scrollTarget = container || messagesContainer;
        if (scrollTarget) {
          scrollTarget.scrollTop = scrollTarget.scrollHeight;
        }
      });
    }

    const lowerInput = inputMessage.toLowerCase();
    if (activeTab === 'ai') {
      setTimeout(() => handleAiResponse(inputMessage), 500);
    } else if (lowerInput.startsWith('/ai ')) {
      handleAiResponse(inputMessage.slice(4));
    } else if (lowerInput.startsWith('/draw ')) {
      handleDrawImage(inputMessage.slice(6));
    } else if (lowerInput.includes('ai') || lowerInput.includes('bot') || lowerInput.includes('help')) {
      setTimeout(() => handleAiResponse(inputMessage), 1000);
    }
    
    setInputMessage('');
    // Clear translation preview mode after sending
    setIsPreviewMode(false);
    setOriginalInputText('');
    propSocket.emit('stop typing', 'global');
  };

  const cancelScheduledMessage = async (scheduledMessageId: string) => {
    try {
      const res = await fetch(`/api/message/scheduled/${scheduledMessageId}?userId=${user._id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setScheduledMessages(prev => prev.filter(m => m.id !== scheduledMessageId));
        setMessages(prev => prev.filter(m => m.id !== scheduledMessageId));
        addNotification('Scheduled message cancelled.', 'success');
      }
    } catch (error) {
      console.error('Cancel scheduled message error:', error);
      addNotification('Unable to cancel scheduled message. Try again.', 'error');
    }
  };

  const explainMessageWithAI = async (messageId: string, originalText: string) => {
    const trimmed = (originalText || "").trim();
    if (!trimmed) return;

    console.log("[AI Explain] Starting explanation for message:", messageId, trimmed.substring(0, 50));
    setExplainingId(messageId);
    try {
      const response = await securePost("/api/ai/chat", {
        prompt: `Explain this message in simple English and make it easy to understand. Keep it short (max 3-5 lines). Return ONLY the explanation text (no headings/bullets).\n\nMessage: "${trimmed}"`
      });

      console.log("[AI Explain] Response status:", response.status);
      const data = await response.json();
      console.log("[AI Explain] Response data:", data);
      const explanation = data?.text || "Sorry, I couldn't explain that right now.";
      console.log("[AI Explain] Extracted explanation:", explanation);

      // Store explanation on the message itself, not as a separate AI message
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, explainedText: explanation }
          : msg
      ));
      addNotification('AI Explanation ready!', 'success');
    } catch (e) {
      console.error("Explain AI error:", e);
      // Store error on the message
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, explainedText: "(AI explanation unavailable — please check your connection or try again later)" }
          : msg
      ));
    } finally {
      setExplainingId(null);
    }
  };

  // Auto-detect if text is Hindi or English and translate to opposite
  const detectLanguage = (text: string): 'hi' | 'en' => {
    // Check for Hindi characters (Devanagari range: 0900-097F)
    const hindiRegex = /[\u0900-\u097F]/;
    if (hindiRegex.test(text)) return 'hi';
    
    // Check for common Hindi words written in Roman script
    const commonHindiWords = [
      'kya', 'kar', 'rahi', 'rahe', 'hai', 'ho', 'kaise', 'aap', 'tum', 'mein',
      'nahi', 'accha', 'theek', 'dhanyawad', 'shukriya', 'namaste', 'alvida',
      'maaf', 'bahut', 'achha', 'bura', 'kal', 'aaj', 'parson', 'kesi', 'kese',
      'kyun', 'kidhar', 'kahan', 'jab', 'tab', 'yahan', 'vahan', 'sath', 'saath',
      'liye', 'wala', 'wale', 'wali', 'bhi', 'toh', 'par', 'lekin', 'magar',
      'phir', 'fir', 'abhi', 'ab', 'pehle', 'badmein', 'jaldi', 'der', 'thik'
    ];
    
    const lowerText = text.toLowerCase();
    const hasHindiWords = commonHindiWords.some(word => lowerText.includes(word));
    
    // If contains Hindi words in Roman script, detect as Hindi
    if (hasHindiWords && lowerText.length > 2) {
      return 'hi';
    }
    
    // Additional check for common Hindi patterns
    const hindiPatterns = [
      /\b(ho|hai|hain|tha|the|thi|hogi|hoga)\b/i,
      /\b(kya|kysi|kese|kaise)\b/i,
      /\b(aap|tum|main|hum)\b/i,
      /\b(mujhe|mere|meri)\b/i,
      /\b(tujhe|tere|teri)\b/i,
      /\b(iske|uske|inki|unki)\b/i
    ];
    
    const hasHindiPattern = hindiPatterns.some(pattern => pattern.test(lowerText));
    if (hasHindiPattern) {
      return 'hi';
    }
    
    // Default to English
    return 'en';
  };

  // Auto-translate incoming message on receive
  const autoTranslateIncomingMessage = async (messageId: string, text: string, targetLang: string) => {
    if (!text.trim()) return;
    
    console.log('[Auto-Translate] STARTING for message:', messageId.slice(0, 8), 'text:', text.slice(0, 30), 'target:', targetLang);
    
    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          targetLanguage: targetLang,
          sourceLanguage: 'auto'
        })
      });

      const data = await response.json();
      console.log('[Auto-Translate] RESPONSE:', messageId.slice(0, 8), { status: response.status, success: data?.success, text: data?.text?.slice(0, 30), source: data?.source });
      
      if (!response.ok || !data?.success) {
        console.warn('[Auto-Translate] Translation request failed', response.status, data?.error);
        return;
      }
      
      if (!data.text) {
        console.warn('[Auto-Translate] No text in response');
        return;
      }
      
      if (data.text.toLowerCase() === text.toLowerCase()) {
        console.warn('[Auto-Translate] Translation same as original, skipping:', data.text.slice(0, 30));
        return;
      }
      
      // Update the message with translation
      console.log('[Auto-Translate] SUCCESS! Updating message with translation');
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, translatedText: data.text, originalText: text, translateTargetLang: targetLang }
          : msg
      ));
      
      console.log(`[Auto-Translate] Message ${messageId.slice(0, 8)}... translated to ${targetLang}: ${data.text.slice(0, 30)}`);
    } catch (e) {
      console.error("[Auto-Translate] FAILED with exception:", e);
    }
  };

  const translateMessage = async (messageId: string, originalText: string, targetLang?: string) => {
    const trimmed = (originalText || "").trim();
    if (!trimmed) return;

    // Auto-detect source language and translate to opposite
    const detectedLang = detectLanguage(trimmed);
    const target = targetLang || (detectedLang === 'hi' ? 'en' : 'hi'); // If Hindi, translate to English, else to Hindi
    
    console.log("[Translate] Detected:", detectedLang, "→ Target:", target);
    setTranslatingId(messageId);
    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          targetLanguage: target,
          sourceLanguage: detectedLang
        })
      });

      console.log("[Translate] Response status:", response.status);
      const data = await response.json();
      console.log("[Translate] Response data:", data);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${response.status}: ${response.statusText || 'Translation request failed'}`);
      }

      if (!data.text || typeof data.text !== 'string') {
        throw new Error('Translation API did not return translated text');
      }

      const translatedText = data.text.trim();

      // Store translation on the message, keep original text
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, translatedText, originalText: msg.originalText || trimmed, translateTargetLang: target }
          : msg
      ));
      const langName = target === 'hi' ? 'Hindi' : 'English';
      addNotification(`Translated to ${langName}`, 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.error("[Translate] Error:", message);
      addNotification(`Translation failed: ${message}`, 'error');

      // Store error on the message
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, translatedText: "(Translation unavailable — please check your connection or try again later)", originalText: trimmed }
          : msg
      ));
    } finally {
      setTranslatingId(null);
    }
  };

  const translateOutgoingMessage = async (text: string, targetLang: string): Promise<string> => {
    if (!text.trim()) return text;
    
    console.log("[Outgoing Translate] Starting:", { text: text.slice(0, 30), targetLang });
    setIsTranslatingOutgoing(true);
    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          targetLanguage: targetLang,
          sourceLanguage: 'auto'
        })
      });

      console.log("[Outgoing Translate] Response status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("[Outgoing Translate] Response data:", data);
      
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${response.status}: ${response.statusText || 'Translation request failed'}`);
      }
      
      if (!data.text || typeof data.text !== 'string') {
        console.error("[Outgoing Translate] No translation in response");
        addNotification('Translation failed - no text returned', 'error');
        return text;
      }
      
      const translatedText = data.text.trim();
      
      // Check if translation actually happened
      if (translatedText.toLowerCase() === text.toLowerCase()) {
        console.warn("[Outgoing Translate] Translation returned same text");
        addNotification('Translation returned same text', 'warning');
      } else {
        addNotification(`Message translated to ${SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang}`, 'success');
      }
      
      return translatedText;
    } catch (e) {
      console.error("[Outgoing Translate] Error:", e);
      addNotification(`Translation failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
      return text;
    } finally {
      setIsTranslatingOutgoing(false);
    }
  };

  const handleDrawImage = async (prompt: string) => {
    setIsAiThinking(true);
    try {
      const response = await fetch("/api/ai/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Could not generate");
        return;
      }
      if (data.imageUrl) {
        propSocket?.emit("send_message", {
          user: "My Assistant",
          to: selectedUser?.name,
          text: `Generated for: ${prompt}`,
          image: data.imageUrl,
          isAI: true,
          sentiment: "🎨",
        });
      } else if (data.textFallback) {
        propSocket?.emit("send_message", {
          user: "My Assistant",
          to: selectedUser?.name,
          text: `🎨 ${prompt}\n\n${data.textFallback}`,
          isAI: true,
          sentiment: "🎨",
        });
      }
    } catch (error) {
      console.error("Image Gen Error:", error);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleAiResponse = async (prompt: string) => {
    if (isAiThinking) return;
    setIsAiThinking(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "AI Node is currently busy.");
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        user: "My Assistant",
        to: user.name,
        text: data.text,
        timestamp: new Date().toISOString(),
        isAI: true,
        sentiment: '🤖',
        translatedText: undefined,
        readBy: [],
        deliveredAt: undefined,
        senderId: 'ai-assistant',
        sender: undefined
      };
      
      setMessages(prev => [...prev, aiMessage]);
      propSocket?.emit('send_message', aiMessage);
    } catch (error: any) {
      console.error("AI Error:", error);
      const errorMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        user: "My Assistant",
        text: `System: ${error.message || "AI Node is currently busy or offline. Please try again in a moment."}`,
        timestamp: new Date().toISOString(),
        isAI: true,
        sentiment: '⚠️',
        translatedText: undefined,
        readBy: [],
        deliveredAt: undefined,
        senderId: 'ai-assistant',
        sender: undefined
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const newMessage = e.target.value;
    setInputMessage(newMessage);
    
    // Emit typing indicator for real-time communication
    if (propSocket && newMessage.length > 0) {
      propSocket.emit('typing', selectedGroup?._id || selectedUser?._id || 'global');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        propSocket.emit('stop typing', selectedGroup?._id || selectedUser?._id || 'global');
      }, 1000);
    }
    
    // Enhanced AI suggestion triggers
    const shouldTriggerSuggestions = 
      // Basic length check
      (newMessage.length >= 3 && newMessage.length <= 100) &&
      // Don't trigger for commands or special characters
      !newMessage.startsWith('/') &&
      !newMessage.startsWith('#') &&
      !newMessage.startsWith('@') &&
      // Trigger for question patterns
      (newMessage.includes('?') || 
       newMessage.includes('what') || 
       newMessage.includes('how') || 
       newMessage.includes('when') || 
       newMessage.includes('where') || 
       newMessage.includes('why') ||
       // Or for statement patterns that might need completion
       (newMessage.includes('...') || newMessage.endsWith('...')) ||
       // Or for greeting patterns
       (newMessage.toLowerCase().includes('hi') || 
        newMessage.toLowerCase().includes('hello') || 
        newMessage.toLowerCase().includes('hey')) ||
       // Or for messages that seem incomplete
       (newMessage.length > 10 && !newMessage.match(/[.!?]$/)));
    
    if (shouldTriggerSuggestions) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        generateAiSuggestions(newMessage);
      }, 600); // Reduced debounce for faster response
    } else {
      setAiSuggestions([]);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Keyboard shortcuts for AI suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowUp':
        if (aiSuggestions.length > 0) {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev <= 0 ? aiSuggestions.length - 1 : prev - 1
          );
        }
        break;
      case 'ArrowDown':
        if (aiSuggestions.length > 0) {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev >= aiSuggestions.length - 1 ? 0 : prev + 1
          );
        }
        break;
      case 'Enter':
        if (e.shiftKey) return; // Allow shift+enter for new line
        if (selectedSuggestionIndex >= 0 && aiSuggestions.length > 0) {
          e.preventDefault();
          // Use the selected suggestion and send it immediately
          const suggestion = aiSuggestions[selectedSuggestionIndex];
          setInputMessage(suggestion);
          setAiSuggestions([]);
          setSelectedSuggestionIndex(-1);
          // Send the suggestion as message after a brief delay to ensure state update
          setTimeout(() => {
            handleSendMessage();
          }, 0);
        }
        // If no suggestion is selected, allow default form submission
        break;
      case 'Escape':
        setAiSuggestions([]);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const deleteCallFromHistory = (callType: 'missed' | 'outgoing' | 'received', index: number) => {
    if (callType === 'missed') {
      setMissedCalls(calls => calls.filter((_, i) => i !== index));
    } else if (callType === 'outgoing') {
      setOutgoingCalls(calls => calls.filter((_, i) => i !== index));
    } else if (callType === 'received') {
      setReceivedCalls(calls => calls.filter((_, i) => i !== index));
    }
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        // Upload to server with base64 data
        fetch('/api/upload-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user._id,
            profilePic: base64
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            handleProfilePicUpdate(base64);
            showBrowserNotification('✅ Profile Updated', 'Your profile picture has been updated!', 'success');
          } else {
            showBrowserNotification('❌ Upload Failed', data.message || 'Failed to upload profile picture', 'error');
          }
        })
        .catch(err => {
          console.error('Profile upload error:', err);
          showBrowserNotification('❌ Upload Error', 'Failed to upload profile picture', 'error');
          // Fallback to localStorage only
          handleProfilePicUpdate(base64);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePicUpdate = (pic: string) => {
    setProfilePic(pic);
    setUser({ ...user, pic });
    localStorage.setItem(`profilePic_${user.name}`, pic);
    // Also update the main user object in localStorage if it exists
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      localStorage.setItem('user', JSON.stringify({ ...parsed, pic }));
    }
    
    // Broadcast profile picture update to all users
    if (propSocket && propSocket.connected) {
      propSocket.emit('profile_pic_updated', {
        userId: user._id,
        userName: user.name,
        profilePic: pic
      });
    }
  };

  const handleProfilePicRemove = () => {
    setProfilePic(null);
    setUser({ ...user, pic: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" });
    localStorage.removeItem(`profilePic_${user.name}`);
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      localStorage.setItem('user', JSON.stringify({ ...parsed, pic: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" }));
    }
  };

  const [isGroupCalling, setIsGroupCalling] = useState(false);
  const [groupCallRoom, setGroupCallRoom] = useState('');

  const startCall = async (type: 'video' | 'audio') => {
    if (selectedGroup) {
      setGroupCallRoom(`intellicall-group-${selectedGroup._id}`);
      setIsGroupCalling(true);
      return;
    }
    if (!selectedUser) {
      alert("Please select a user to call first!");
      return;
    }

    // Reset call ended flag for new call
    callEndedRef.current = false;
    // Reset call rejected flag
    callRejectedByOtherRef.current = false;
    // Reset call missed flag
    callMissedEmittedRef.current = false;
    // Generate unique call ID
    const callId = `${user._id}_${selectedUser._id}_${Date.now()}`;
    currentCallIdRef.current = callId;

    console.log(`📞 Starting ${type} call with ${selectedUser.name} (Call ID: ${callId})`);
    
    // Track outgoing call
    const callStartTime = Date.now();
    setOutgoingCalls(calls => [...calls, { 
      to: selectedUser.name, 
      type, 
      timestamp: callStartTime 
    }]);
    
    // Notify server about call initiation
    if (propSocket && propSocket.connected) {
      propSocket.emit('call_initiated', {
        fromUserId: user._id,
        fromUserName: user.name,
        toUserId: selectedUser._id,
        toUserName: selectedUser.name,
        callType: type,
        timestamp: callStartTime
      });
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });
      setLocalStream(stream);
      setCallType(type);
      setIsCalling(true);
      setIsMuted(false);
      setIsCameraOff(type !== 'video');
      remotePeerUserIdRef.current = selectedUser._id;

      const pc = setupPeerConnection(selectedUser._id);
      
      // Use canvas stream if video and filter is applied, otherwise use original stream
      let streamToSend = stream;
      if (type === 'video' && videoCallFilterId !== 'none') {
        const canvasResult = startCanvasProcessing(stream);
        if (canvasResult) {
          streamToSend = canvasResult.canvasStream;
          canvasStreamRef.current = canvasResult.canvasStream;
        }
      }
      
      streamToSend.getTracks().forEach((track) => pc.addTrack(track, streamToSend));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      propSocket?.emit("offer", {
        toUserId: selectedUser._id,
        from: user.name,
        fromUserId: user._id,
        offer,
        type,
      });
      
      // Also emit call_initiated for proper call tracking
      propSocket?.emit("call_initiated", {
        fromUserId: user._id,
        fromUserName: user.name,
        toUserId: selectedUser._id,
        toUserName: selectedUser.name,
        callType: type,
        timestamp: callStartTime,
      });
      
      // Store call start time for duration tracking
      (window as any).currentCallStartTime = callStartTime;
    } catch (err) {
      console.error("Error starting call:", err);
      alert("Failed to start call. Please check camera/microphone permissions.");
      setIsCalling(false);
      // Remove the outgoing call if failed
      setOutgoingCalls(calls => calls.filter(call => call.timestamp !== callStartTime));
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    
    // Mute/unmute local stream audio tracks
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !newMutedState;
      });
    }
    
    // Also mute/unmute canvas stream audio tracks if active
    if (canvasStreamRef.current) {
      const canvasAudioTracks = canvasStreamRef.current.getAudioTracks();
      canvasAudioTracks.forEach(track => {
        track.enabled = !newMutedState;
      });
    }
    
    console.log(newMutedState ? "🔇 Muted" : "🎤 Unmuted");
    setIsMuted(newMutedState);
  };

  const toggleCamera = () => {
    const newCameraOffState = !isCameraOff;
    
    // Disable/enable local stream video tracks
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !newCameraOffState;
      });
    }
    
    // Also disable/enable canvas stream video tracks if active
    if (canvasStreamRef.current) {
      const canvasVideoTracks = canvasStreamRef.current.getVideoTracks();
      canvasVideoTracks.forEach(track => {
        track.enabled = !newCameraOffState;
      });
    }
    
    console.log(newCameraOffState ? "📷 Camera off" : "📹 Camera on");
    setIsCameraOff(newCameraOffState);
  };

  const rejectCall = () => {
    if (incomingCall) {
      // Notify the server that call was rejected - server will handle missed call tracking
      // and notify both sides to close the call UI
      propSocket?.emit('call_rejected', { 
        toUserId: incomingCall.fromUserId, 
        fromUserId: user._id, 
        fromUserName: user.name,
        toUserName: incomingCall.from,
        callType: incomingCall.type,
        timestamp: Date.now()
      });
      
      // Show notification to receiver
      showBrowserNotification('Call Rejected', `You rejected the call from ${incomingCall.from}`, 'info');
    }
    // Clear incoming call UI immediately
    setIncomingCall(null);
    setIsCalling(false);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    
    // Clear incoming call timer
    if (incomingCallTimerRef.current) {
      clearTimeout(incomingCallTimerRef.current);
      incomingCallTimerRef.current = null;
    }
    
    let callerId = incomingCall.fromUserId;
    if (!callerId && incomingCall.from) {
      const match = friends.find((f) => f.name === incomingCall.from) || allUsers.find((u) => u.name === incomingCall.from);
      callerId = match?._id;
    }
    if (!callerId) {
      console.error('Could not determine caller ID');
      return;
    }
    
    // Track received call
    const callStartTime = Date.now();
    setReceivedCalls(calls => [...calls, { 
      from: incomingCall.from, 
      type: incomingCall.type, 
      timestamp: callStartTime 
    }]);
    
    // Set 1-minute auto end timer
    callTimerRef.current = setTimeout(() => {
      console.log("📞 Auto-ending call after 1 minute");
      endCall();
      showBrowserNotification("📞 Call Ended", "Call automatically ended after 1 minute", "info");
    }, 60000); // 1 minute
    
    // Notify server about call acceptance
    if (propSocket && propSocket.connected) {
      propSocket.emit('call_accepted', {
        fromUserId: callerId,
        fromUserName: incomingCall.from,
        toUserId: user._id,
        toUserName: user.name,
        callType: incomingCall.type,
        timestamp: callStartTime
      });
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCall.type === "video",
        audio: true,
      });
      setLocalStream(stream);
      setCallType(incomingCall.type);
      setIsCalling(true);
      remotePeerUserIdRef.current = callerId;

      const pc = setupPeerConnection(callerId);
      
      // Use canvas stream if video and filter is applied, otherwise use original stream
      let streamToSend = stream;
      if (incomingCall.type === 'video' && videoCallFilterId !== 'none') {
        const canvasResult = startCanvasProcessing(stream);
        if (canvasResult) {
          streamToSend = canvasResult.canvasStream;
          canvasStreamRef.current = canvasResult.canvasStream;
        }
      }
      
      streamToSend.getTracks().forEach((track) => pc.addTrack(track, streamToSend));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      // Flush buffered ICE candidates now that remote description exists.
      if (pendingIceCandidatesRef.current.length) {
        const buffered = pendingIceCandidatesRef.current;
        pendingIceCandidatesRef.current = [];
        for (const cand of buffered) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.error("Error adding buffered ice candidate", e);
          }
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      propSocket?.emit("answer", { toUserId: callerId, answer });
      setIncomingCall(null);
      showBrowserNotification('Call Connected', `Call with ${incomingCall.from} connected`, 'success');
      
      // Note: localVideoRef is handled by useEffect when localStream changes
      
      // Store call start time for duration tracking
      (window as any).currentCallStartTime = callStartTime;
    } catch (err) {
      console.error("Error accepting call:", err);
      // Remove the received call if failed
      setReceivedCalls(calls => calls.filter(call => call.timestamp !== callStartTime));
    }
  };

  const endCall = () => {
    // Prevent duplicate end call processing
    if (callEndedRef.current) {
      console.log("⚠️ Call already ended, ignoring duplicate endCall");
      return;
    }
    callEndedRef.current = true;

    // Clear call timer
    if (callTimerRef.current) {
      clearTimeout(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Clear incoming call timer
    if (incomingCallTimerRef.current) {
      clearTimeout(incomingCallTimerRef.current);
      incomingCallTimerRef.current = null;
    }

    // Check if this was an outgoing call that wasn't accepted (missed call)
    const isOutgoingCall = remoteStream === null && localStream !== null && !incomingCall;
    const callStartTime = (window as any).currentCallStartTime;

    // Only emit call_missed if:
    // 1. It's an outgoing call that wasn't accepted
    // 2. Call wasn't rejected by other party (they already got missed call from server)
    // 3. We haven't already emitted call_missed for this call
    if (isOutgoingCall && callStartTime && selectedUser && !callRejectedByOtherRef.current && !callMissedEmittedRef.current) {
      callMissedEmittedRef.current = true; // Mark as emitted to prevent duplicates
      console.log("📞 Emitting call_missed for outgoing call to:", selectedUser.name);
      
      if (propSocket && propSocket.connected) {
        propSocket.emit('call_missed', {
          fromUserId: user._id,
          fromUserName: user.name,
          toUserId: selectedUser._id,
          toUserName: selectedUser.name,
          callType: callType,
          timestamp: callStartTime
        });
      }
    }
    
    // Stop canvas processing
    stopCanvasProcessing();
    
    // Stop all tracks in local, remote, and canvas streams
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    canvasStreamRef.current?.getTracks().forEach(track => track.stop());
    canvasStreamRef.current = null;
    
    setLocalStream(null);
    setRemoteStream(null);
    setIsCalling(false);
    setIncomingCall(null);
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    pendingIceCandidatesRef.current = [];
    const peerId = remotePeerUserIdRef.current;
    remotePeerUserIdRef.current = null;
    setVideoCallFilterId("none");
    
    // Clear call start time
    delete (window as any).currentCallStartTime;
    
    // Notify the other user that call ended
    if (peerId && propSocket && propSocket.connected) {
      propSocket.emit('end_call', { toUserId: peerId, fromUserId: user._id, fromUserName: user.name });
      showBrowserNotification('Call Ended', 'You ended the call', 'info');
    }
    
    // Reset all call state flags after a short delay (to prevent race conditions)
    setTimeout(() => {
      callEndedRef.current = false;
      callRejectedByOtherRef.current = false;
      currentCallIdRef.current = null;
      console.log("📞 Call state reset for next call");
    }, 2000);
  };

  const summarizeChat = async () => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    try {
      // First, filter messages to only include those from the currently selected chat
      let currentChatMessages = messages.filter(m => {
        // For group chat
        if (selectedGroup) {
          return m.groupId === selectedGroup._id;
        }
        // For private chat with selected user
        if (selectedUser) {
          // Message is part of this chat if:
          // 1. It's sent by current user to selected user, OR
          // 2. It's sent by selected user to current user
          const isFromMeToSelected = m.senderId === user?._id && m.to === selectedUser.name;
          const isFromSelectedToMe = m.senderId === selectedUser._id && m.to === user?.name;
          return isFromMeToSelected || isFromSelectedToMe;
        }
        return false;
      });

      // Filter messages based on summary option
      let messagesToSummarize = currentChatMessages.filter(m => !m.isSystem && m.text);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (summaryOption === 'today') {
        // Get messages from today only
        messagesToSummarize = messagesToSummarize.filter(m => {
          if (m.timestamp) {
            const messageDate = new Date(m.timestamp);
            return messageDate >= today;
          }
          return false;
        });
      } else if (summaryOption === 'yesterday') {
        // Get messages from yesterday only
        messagesToSummarize = messagesToSummarize.filter(m => {
          if (m.timestamp) {
            const messageDate = new Date(m.timestamp);
            return messageDate >= yesterday && messageDate < today;
          }
          return false;
        });
      } else if (summaryOption === 'custom' && customDate) {
        // Get messages from specific date
        const targetDate = new Date(customDate);
        const targetDayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const targetDayEnd = new Date(targetDayStart);
        targetDayEnd.setDate(targetDayEnd.getDate() + 1);
        
        messagesToSummarize = messagesToSummarize.filter(m => {
          if (m.timestamp) {
            const messageDate = new Date(m.timestamp);
            return messageDate >= targetDayStart && messageDate < targetDayEnd;
          }
          return false;
        });
      } else if (summaryOption === 'unread') {
        // Get only unread messages (messages not read by current user)
        messagesToSummarize = messagesToSummarize.filter(m => {
          // Message is unread if:
          // 1. It's not sent by current user
          // 2. It hasn't been read
          // 3. Current user is not in readBy array
          return m.senderId !== user?._id && 
                 !m.read && 
                 (!m.readBy || !m.readBy.includes(user?._id));
        });
      }
      // For 'entire', use all filtered messages

      // Format messages for API
      const formattedMessages = messagesToSummarize.map(m => ({
        senderName: m.user,
        message: m.text,
        createdAt: m.timestamp
      }));

      // Determine chat ID for API
      let chatId;
      if (selectedGroup) {
        chatId = `group_${selectedGroup._id}`;
      } else if (selectedUser) {
        chatId = selectedUser._id;
      } else {
        throw new Error('No chat selected');
      }

      let response;
      let data;
      
      try {
        response = await securePost('/api/ai/summarize', {
          history: formattedMessages.map(m => `${m.senderName}: ${m.message}`).join('\n')
        });
        data = await response.json();
      } catch (authError: any) {
        console.error("Authentication error during summarization:", authError);
        // Fallback to regular API call without auth wrapper
        response = await fetch('/api/ai/summarize', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            history: formattedMessages.map(m => `${m.senderName}: ${m.message}`).join('\n')
          })
        });
        data = await response.json();
      }
      
      // Always return the summary text, even if there was an API issue
      const summaryText = data.summary || data.text || "Unable to generate summary at this time.";
      let summaryPrefix = '';
      
      if (summaryOption === 'today') {
        summaryPrefix = `📋 Today's Summary (${messagesToSummarize.length} messages):\n\n`;
      } else if (summaryOption === 'yesterday') {
        summaryPrefix = `📋 Yesterday's Summary (${messagesToSummarize.length} messages):\n\n`;
      } else if (summaryOption === 'custom' && customDate) {
        const formattedDate = new Date(customDate).toLocaleDateString();
        summaryPrefix = `📋 ${formattedDate} Summary (${messagesToSummarize.length} messages):\n\n`;
      } else if (summaryOption === 'unread') {
        summaryPrefix = `📋 Unread Messages Summary (${messagesToSummarize.length} messages):\n\n`;
      } else {
        summaryPrefix = `📋 Entire Chat Summary (${messagesToSummarize.length} messages):\n\n`;
      }
      
      setSummary(summaryPrefix + summaryText);
    } catch (error: any) {
      console.error("Summarization Error:", error);
      setSummary("Sorry, summarization is temporarily unavailable. Please try again later.");
    } finally {
      setIsSummarizing(false);
      setShowSummaryOptions(false); // Hide options after summarizing
    }
  };

  const summarizeUnreadMessages = async () => {
    // First, filter messages to only include those from the currently selected chat
    let currentChatMessages = messages.filter(m => {
      // For group chat
      if (selectedGroup) {
        return m.groupId === selectedGroup._id;
      }
      // For private chat with selected user
      if (selectedUser) {
        // Message is part of this chat if:
        // 1. It's sent by current user to selected user, OR
        // 2. It's sent by selected user to current user
        const isFromMeToSelected = m.senderId === user?._id && m.to === selectedUser.name;
        const isFromSelectedToMe = m.senderId === selectedUser._id && m.to === user?.name;
        return isFromMeToSelected || isFromSelectedToMe;
      }
      return false;
    });

    // Filter messages that are sent by others and not read (not blue-ticked)
    const unreadMessages = currentChatMessages.filter(m => 
      m.senderId !== user?._id && 
      m.text && 
      !m.isSystem && 
      m.status !== 'read'
    );

    if (unreadMessages.length === 0) {
      setSummary("No unread messages to summarize.");
      return;
    }

    setIsSummarizing(true);
    try {
      // Determine chat ID for API
      let chatId;
      if (selectedGroup) {
        chatId = `group_${selectedGroup._id}`;
      } else if (selectedUser) {
        chatId = selectedUser._id;
      } else {
        throw new Error('No chat selected');
      }

      // Try to use the unread summary endpoint first
      try {
        const response = await secureGet(`/api/chat/${chatId}/unread-summary`);
        const data = await response.json();
        
        if (data.summary) {
          setSummary(`📋 Unread Messages Summary (${data.unreadCount} messages):\n\n${data.summary}`);
          return;
        }
      } catch (unreadError) {
        console.log('Unread summary endpoint failed, falling back to regular summary');
      }

      // Fallback: Use regular summary endpoint with unread messages
      const formattedMessages = unreadMessages.map(m => ({
        senderName: m.user,
        message: m.text,
        createdAt: m.timestamp
      }));

      const response = await securePost('/api/chat/summary', {
        chatId,
        summaryOption: 'unread',
        messages: formattedMessages
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Summarization failed.");
      }

      setSummary(`📋 Unread Messages Summary (${unreadMessages.length} messages):\n\n${data.summary || "No summary returned."}`);
    } catch (error: any) {
      console.error("Unread Summarization Error:", error);
      setSummary(error?.message || "Could not summarize unread messages. Try again.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && propSocket) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64File = reader.result as string;
        const messageId = Math.random().toString(36).substr(2, 9);
        const messageData: Message = {
          id: messageId,
          user: user.name,
          to: selectedUser?.name,
          text: `📁 Sent a file: ${file.name}`,
          image: file.type.startsWith('image/') ? base64File : undefined,
          timestamp: new Date().toISOString(),
          profilePic: profilePic || undefined,
          isGhost: isGhostMode,
          translatedText: undefined,
          readBy: [],
          deliveredAt: undefined,
          senderId: user._id,
          sender: undefined
        };
        
        // Add locally
        setMessages(prev => [...prev, messageData]);
        
        // Emit to server
        propSocket.emit('new message', {
          id: messageId,
          sender: { _id: user._id, name: user.name, pic: profilePic },
          to: selectedUser?.name,
          recipientId: selectedUser?._id,
          toUserId: selectedUser?._id,
          content: `📁 Sent a file: ${file.name}`,
          image: file.type.startsWith('image/') ? base64File : undefined,
          isBlind: activeTab === 'blind',
          chat: { users: [{ _id: 'all' }] }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      callMediaRecorderRef.current = mediaRecorder;
      callAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          callAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(callAudioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const messageId = Math.random().toString(36).substr(2, 9);
          
          const messageData: Message = {
            id: messageId,
            user: user.name,
            to: selectedGroup ? undefined : (selectedUser?.name || (activeTab === 'blind' ? undefined : undefined)),
            groupId: selectedGroup?._id,
            text: "🎤 Voice Message",
            audio: base64Audio,
            timestamp: new Date().toISOString(),
            profilePic: profilePic || undefined,
            isGhost: isGhostMode,
            isBlind: activeTab === 'blind',
            translatedText: undefined,
            readBy: [],
            deliveredAt: undefined,
            senderId: user._id,
            sender: undefined
          };

          // Add locally
          setMessages(prev => [...prev, messageData]);

          propSocket?.emit('new message', { 
            id: messageId,
            sender: { _id: user._id, name: user.name, pic: profilePic },
            to: messageData.to,
            groupId: messageData.groupId,
            content: "🎤 Voice Message", 
            audio: base64Audio,
            isBlind: activeTab === 'blind',
            chat: { users: selectedGroup ? selectedGroup.members.map(m => ({ _id: m._id })) : (selectedUser ? [{ _id: selectedUser._id }, { _id: user._id }] : (activeTab === 'blind' ? [{ _id: 'all' }] : [{ _id: 'all' }])) }
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsCallRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = () => {
    if (callMediaRecorderRef.current && isCallRecording) {
      callMediaRecorderRef.current.stop();
      setIsCallRecording(false);
    }
  };

  const addReaction = (messageId: string, emoji: string) => {
    if (!propSocket) return;
    
    // Add reaction locally for immediate feedback
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = m.reactions || {};
        reactions[emoji] = [...(reactions[emoji] || []), propSocket.id];
        return { ...m, reactions };
      }
      return m;
    }));
    
    // Emit to server for real-time sync
    propSocket?.emit('add_reaction', { 
      messageId, 
      emoji, 
      username: user.name,
      userId: user._id 
    });
    
    // Show notification for better UX
    showBrowserNotification('Reaction Added', `You reacted with ${emoji}`);
  };

  const handleCreateReel = async () => {
    try {
      const caption = newReelCaption.trim();
      const mediaUrl = newReelMediaUrl.trim();
      if (!mediaUrl) {
        addNotification('Please select a file or enter a media URL', 'error');
        return;
      }

      // Validate data URL format for uploaded files
      if (mediaUrl.startsWith('data:')) {
        // Check if data URL is valid
        if (mediaUrl.length < 100) {
          addNotification('Invalid file. Please select a valid image or video.', 'error');
          return;
        }
      }

      addNotification('Uploading your post...', 'info');

      const res = await securePost('/api/reels', {
          userId: user._id,
          caption,
          mediaUrl,
          mediaType: newReelMediaType,
        });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addNotification(data.message || 'Failed to upload post', 'error');
        return;
      }

      const data = await res.json();
      setReels(prev => [data, ...prev]);
      setNewReelCaption('');
      setNewReelMediaUrl('');
      setNewReelMediaType('video');
      addNotification('Post uploaded successfully! 🎉', 'success');
    } catch (e) {
      console.error('Create reel error:', e);
      addNotification('Failed to upload post. Please try again.', 'error');
    }
  };

  const shareReelToChat = (reel: Reel) => {
    if (!propSocket) return;

    console.log('Sharing reel:', {
      reel,
      selectedUser,
      selectedGroup,
      user: user.name
    });

    // Share reel using the proper propSocket event
    const shareData = {
      from: user.name,
      fromId: user._id,
      reelId: reel._id,
      caption: reel.caption,
      mediaUrl: reel.mediaUrl,
      mediaType: reel.mediaType,
      friends: selectedUser ? [selectedUser._id] : [],
      groups: selectedGroup ? [selectedGroup._id] : []
    };

    console.log('Emitting share_reel_to_friends_and_groups:', shareData);
    propSocket.emit('share_reel_to_friends_and_groups', shareData);
    console.log('Reel share emitted successfully');
  };

  // Function to handle clicking on shared reel messages
  const handleSharedReelClick = (reelData: any) => {
    // Navigate to reels feed and find the specific reel
    setActiveFeed('reels');
    setActiveTab('all');
    setShowSidebar(false);
    if (window.innerWidth < 768) setShowChat(false);
    
    // Store the reel ID to auto-play it when reels feed loads
    setTimeout(() => {
      const reelElement = document.querySelector(`[data-reel-id="${reelData._id}"]`);
      if (reelElement) {
        reelElement.scrollIntoView({ behavior: 'smooth' });
        // Trigger play if it's a video
        const videoElement = reelElement.querySelector('video');
        if (videoElement) {
          videoElement.play().catch(e => console.log('Auto-play failed:', e));
        }
      }
    }, 500);
    
    showBrowserNotification('?? Opening Reels Feed', 'Viewing shared reel in reels section', 'info');
  };

  // Function to open user profile from reels
  const openUserProfile = (reel: Reel) => {
    const targetUser: UserType = {
      _id: reel.createdBy as string,
      name: reel.createdByName || 'Unknown User',
      email: `${reel.createdByName}@intellicall.com`,
      pic: `https://picsum.photos/seed/${reel.createdByName}/200/200`,
      isVerified: (reel.likes || []).length > 5,
    };
    setSelectedUserProfile(targetUser);
    setShowUserProfile(true);
  };

  const toggleReelLike = async (reel: Reel) => {
    try {
      await fetch(`/api/reels/${reel._id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });
    } catch (e) {
      console.error('toggleReelLike error:', e);
    }
  };

  const handleAddComment = async (reelId: string) => {
    if (!commentText.trim()) return;
    try {
      await fetch(`/api/reels/${reelId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, text: commentText }),
      });
      setCommentText('');
    } catch (e) {
      console.error('handleAddComment error:', e);
    }
  };

  const startEditReel = (reel: Reel) => {
    setEditReelId(reel._id);
    setEditReelCaption(reel.caption || '');
    setEditReelMediaUrl(reel.mediaUrl || '');
    setEditReelMediaType(reel.mediaType || 'video');
  };

  const saveEditReel = async () => {
    if (!editReelId) return;
    try {
      const caption = editReelCaption.trim();
      const mediaUrl = editReelMediaUrl.trim();
      if (!mediaUrl) {
        alert('Media URL required');
        return;
      }

      const res = await fetch(`/api/reels/${editReelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          caption,
          mediaUrl,
          mediaType: editReelMediaType,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Edit failed');
      }
      setEditReelId(null);
      setEditReelCaption('');
      setEditReelMediaUrl('');
    } catch (e) {
      console.error('saveEditReel error:', e);
      alert('Edit failed');
    }
  };

  const deleteReel = async (reel: Reel) => {
    if (!window.confirm('Delete this reel?')) return;
    try {
      const res = await fetch(`/api/reels/${reel._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Delete failed');
      }
    } catch (e) {
      console.error('deleteReel error:', e);
      alert('Delete failed');
    }
  };

  // ===== WATCH TOGETHER FEATURE =====
  const openWatchTogether = (reel: Reel) => {
    setWatchTogetherReel(reel);
    setIsWatchTogetherOpen(true);
    
    // Get participants for current chat
    let participants: UserType[] = [];
    if (selectedUser) {
      participants = [selectedUser];
    } else if (selectedGroup && selectedGroup.members) {
      participants = selectedGroup.members
        .filter(m => m._id !== user._id);
    }
    setWatchTogetherParticipants(participants);
    
    // Notify via propSocket
    propSocket?.emit('watch_together_invite', {
      reelId: reel._id,
      reelCaption: reel.caption,
      from: user.name,
      fromId: user._id,
      participants: participants.map(p => p._id),
    });
    
    addNotification('Started watch together session! 🎬', 'success');
  };

  const closeWatchTogether = () => {
    setIsWatchTogetherOpen(false);
    setWatchTogetherReel(null);
    setWatchTogetherParticipants([]);
    
    propSocket?.emit('watch_together_end', {
      fromId: user._id,
    });
  };

  // ===== REPOST TO STORY FEATURE =====
  const openRepostModal = (reel: Reel) => {
    setRepostReel(reel);
    setRepostCaption(reel.caption || '');
    setShowRepostModal(true);
  };

  const closeRepostModal = () => {
    setShowRepostModal(false);
    setRepostReel(null);
    setRepostCaption('');
  };

  const handleRepostToStory = async () => {
    if (!repostReel || !user) return;
    
    try {
      addNotification('Reposting to story...', 'info');
      
      const storyData = {
        userId: user._id,
        image: repostReel.mediaUrl,
        caption: repostCaption || repostReel.caption || 'Shared from reels',
        repostedFrom: {
          reelId: repostReel._id,
          creatorId: repostReel.createdBy,
          creatorName: repostReel.createdByName,
        },
        isRepost: true,
      };
      
      const res = await securePost('/api/stories', storyData);
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addNotification(data.message || 'Failed to repost to story', 'error');
        return;
      }
      
      addNotification('Successfully reposted to story! ✨', 'success');
      closeRepostModal();
      
      // Refresh stories
      propSocket?.emit('story_created', { userId: user._id });
    } catch (e) {
      console.error('Repost to story error:', e);
      addNotification('Failed to repost. Please try again.', 'error');
    }
  };

  // ===== AI SUGGESTIONS FEATURE =====
  const openAISuggestions = () => {
    setIsAISuggestionsOpen(true);
  };

  const closeAISuggestions = () => {
    setIsAISuggestionsOpen(false);
  };

  const handleShareFromAI = (reel: Reel) => {
    shareReelToChat(reel);
    addNotification('Reel shared to chat! 📤', 'success');
  };

  const handleWatchTogetherFromAI = (reel: Reel) => {
    openWatchTogether(reel);
    closeAISuggestions();
  };

  return (
    <div className={cn(
      "h-[100dvh] min-h-0 flex flex-col font-sans text-xs overflow-hidden selection:bg-emerald-100 transition-colors duration-500 relative",
      isDarkMode ? "bg-slate-950 text-white" : "bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900"
    )}>
      {/* Enhanced Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, 120, 0],
            x: [0, 80, 0],
            y: [0, -80, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "absolute -top-[15%] -left-[15%] w-[70%] h-[70%] rounded-full blur-[150px] opacity-30 transition-colors duration-1000",
            moodColor === 'emerald' ? "bg-gradient-to-r from-emerald-400 to-cyan-400" : 
            moodColor === 'blue' ? "bg-gradient-to-r from-blue-400 to-indigo-400" : 
            moodColor === 'red' ? "bg-gradient-to-r from-red-400 to-orange-400" : "bg-gradient-to-r from-purple-400 to-pink-400"
          )}
        />
        <motion.div 
          animate={{ 
            scale: [1.3, 1, 1.3],
            rotate: [0, -120, 0],
            x: [0, -80, 0],
            y: [0, 80, 0]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "absolute -bottom-[15%] -right-[15%] w-[70%] h-[70%] rounded-full blur-[150px] opacity-30 transition-colors duration-1000",
            moodColor === 'emerald' ? "bg-gradient-to-r from-cyan-400 to-teal-400" : 
            moodColor === 'blue' ? "bg-gradient-to-r from-indigo-400 to-purple-400" : 
            moodColor === 'red' ? "bg-gradient-to-r from-orange-400 to-yellow-400" : "bg-gradient-to-r from-pink-400 to-rose-400"
          )}
        />
        {/* Floating grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="h-full w-full bg-[linear-gradient(to_right,slate-900_1px,transparent_1px),linear-gradient(to_bottom,slate-900_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_70%,transparent_100%)]"></div>
        </div>
        <FloatingParticles isDarkMode={!!isDarkMode} />
      </div>

      <Navbar 
        user={user} 
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        onlineCount={onlineUsers.length + 1}
        storiesCount={newStoriesCount}
        onProfileClick={() => setShowProfile(!showProfile)}
        incomingCall={incomingCall}
        isCalling={isCalling}
        missedCalls={missedCalls}
        outgoingCalls={outgoingCalls}
        receivedCalls={receivedCalls}
        onAcceptCall={acceptCall}
        onRejectCall={rejectCall}
        onDeleteCall={deleteCallFromHistory}
        socketConnected={isSocketConnected}
      />
      <main className="flex-1 flex relative z-10 min-h-0 overflow-hidden">
        {/* Sidebar - mobile: drawer + backdrop so it does not overlap chat messily */}
        <AnimatePresence>
          {showSidebar && (
            <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close menu"
              className="fixed inset-0 z-[85] bg-black/55 backdrop-blur-[2px] md:hidden"
              onClick={() => setShowSidebar(false)}
            />
            <motion.aside
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                "fixed inset-y-0 left-0 z-[90] w-96 max-w-[100vw] border-r flex flex-col md:relative md:z-0 md:translate-x-0 md:opacity-100 shadow-2xl transition-all duration-500 backdrop-blur-2xl h-full touch-pan-y",
                isDarkMode
                  ? "bg-gradient-to-b from-slate-950/98 via-slate-900/95 to-slate-950/98 border-slate-800/60 shadow-slate-950/50"
                  : "bg-gradient-to-b from-white/98 via-slate-50/95 to-white/98 border-slate-200/60 shadow-slate-300/30"
              )}
            >
              <div className="flex flex-col h-full overflow-hidden">
                {/* Sidebar Header - Enhanced */}
                <div className={cn(
                  "p-5 border-b",
                  isDarkMode
                    ? "border-slate-800/50 bg-gradient-to-r from-slate-900/50 to-slate-950/30"
                    : "border-slate-200/50 bg-gradient-to-r from-slate-50/50 to-white/30"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xl relative overflow-hidden",
                          isDarkMode
                            ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-500/30"
                            : "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 shadow-slate-900/20"
                        )}
                      >
                        {/* Shimmer effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                        <MessageSquare className="w-5 h-5 relative z-10" />
                      </motion.div>
                      <div>
                        <h2 className={cn("text-sm font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>CHATS</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Messages</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shadow-lg",
                          isSocketConnected ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50"
                        )}
                      />
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest",
                        isSocketConnected ? "text-emerald-500" : "text-red-500"
                      )}>{isSocketConnected ? "ONLINE" : "OFFLINE"}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={verificationInput}
                          onChange={(e) => setVerificationInput(e.target.value)}
                          placeholder="User or Group..."
                          className={cn(
                            "w-20 px-2 py-1 text-[9px] rounded-lg border outline-none",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-100 border-slate-200 text-slate-900"
                          )}
                        />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (verificationInput.trim()) {
                              verifyEntity(verificationInput.trim());
                              setVerificationInput('');
                            }
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-all shadow-md border",
                            isDarkMode
                              ? "bg-gradient-to-br from-emerald-600 to-emerald-700 text-emerald-100 hover:from-emerald-500 hover:to-emerald-600 border-emerald-500/30 shadow-emerald-500/20"
                              : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 border-emerald-400/50 shadow-emerald-500/30"
                          )}
                          title="Verify User or Group"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "md:hidden p-2.5 rounded-xl transition-all shadow-md border",
                        isDarkMode
                          ? "text-slate-400 hover:text-white hover:bg-slate-800 bg-slate-900/50 border-slate-700"
                          : "text-slate-500 hover:text-slate-900 hover:bg-white bg-slate-100/80 border-slate-200"
                      )}
                      onClick={() => setShowSidebar(false)}
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowFriendsModal(true)}
                        className={cn(
                          "p-2.5 rounded-xl transition-all relative shadow-md border",
                          isDarkMode
                            ? "bg-gradient-to-br from-slate-800 to-slate-900 text-blue-400 hover:text-blue-300 border-slate-700 hover:border-blue-500/30"
                            : "bg-gradient-to-br from-white to-slate-100 text-blue-600 hover:text-blue-700 border-slate-200 hover:border-blue-400/50 shadow-slate-200/50"
                        )}
                        title="Friends"
                      >
                        <User className="w-4 h-4" />
                        {friendRequests.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-bounce">
                            {friendRequests.length}
                          </span>
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowNewGroupModal(true)}
                        className={cn(
                          "p-2.5 rounded-xl transition-all shadow-md border",
                          isDarkMode
                            ? "bg-gradient-to-br from-slate-800 to-slate-900 text-emerald-400 hover:text-emerald-300 border-slate-700 hover:border-emerald-500/30"
                            : "bg-gradient-to-br from-white to-slate-100 text-emerald-600 hover:text-emerald-700 border-slate-200 hover:border-emerald-400/50 shadow-slate-200/50"
                        )}
                        title="New Group"
                      >
                        <Users className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => {
                          console.log('Info button clicked!');
                          setShowTeamModal(true);
                        }}
                        className={cn(
                          "p-2.5 rounded-xl transition-all shadow-md border",
                          isDarkMode
                            ? "bg-gradient-to-br from-slate-800 to-slate-900 text-amber-400 hover:text-amber-300 border-slate-700 hover:border-amber-500/30"
                            : "bg-gradient-to-br from-white to-slate-100 text-amber-600 hover:text-amber-700 border-slate-200 hover:border-amber-400/50 shadow-slate-200/50"
                        )}
                        title="About IntelliCall & team"
                      >
                        <Info className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2, rotate: 15 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => setShowChatSettings(true)}
                        className={cn(
                          "p-2.5 rounded-xl transition-all shadow-md border",
                          isDarkMode
                            ? "bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400 hover:text-white border-slate-700 hover:border-slate-500/50"
                            : "bg-gradient-to-br from-white to-slate-100 text-slate-500 hover:text-slate-900 border-slate-200 hover:border-slate-400/50 shadow-slate-200/50"
                        )}
                        title="Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                  
                  <div className="relative group">
                    <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", isDarkMode ? "text-slate-500 group-focus-within:text-emerald-500" : "text-slate-400 group-focus-within:text-emerald-500")} />
                    <input 
                      type="text" 
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        "w-full pl-10 pr-3 py-2 rounded-lg text-[10px] font-bold transition-all outline-none border",
                        isDarkMode 
                          ? "bg-slate-900/50 border-slate-800 text-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10" 
                          : "bg-slate-50 border-slate-100 text-slate-900 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10"
                      )}
                    />
                  </div>
                </div>

                
                <div className={cn("flex-1 overflow-y-auto custom-scrollbar py-3 px-3", isDarkMode ? "bg-slate-950" : "bg-slate-50")}>
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* AI Assistant Tab */}
                    <div className="px-4 mb-6 space-y-2">
                    <motion.div 
                      variants={sidebarItemVariants}
                      initial="initial"
                      animate="animate"
                      onClick={() => {
                        setActiveTab('ai');
                        setActiveFeed('chat');
                        setSelectedUser(null);
                        setSelectedGroup(null);
                        markMessagesAsRead('ai');
                        if (window.innerWidth < 768) setShowSidebar(false);
                      }}
                      className={cn(
                        "flex items-center gap-5 p-4 rounded-[2rem] transition-all cursor-pointer group relative border border-transparent",
                        activeTab === 'ai'
                          ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100")
                          : (isDarkMode ? "hover:bg-slate-800/50 hover:border-slate-700" : "hover:bg-white hover:shadow-lg hover:shadow-slate-200/50")
                      )}
                    >
                      <div className="relative">
                        <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 group-hover:rotate-12 transition-transform">
                          <Bot className="w-7 h-7" />
                        </div>
                        <NotificationBadge 
                          count={unreadMessageCounts.get('ai') || 0} 
                          isDarkMode={isDarkMode} 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className={cn("font-black text-sm tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>MY ASSISTANT</span>
                          <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded", isDarkMode ? "text-emerald-300 bg-emerald-500/30" : "text-emerald-600 bg-emerald-200/50")}>AI</span>
                        </div>
                        <p className={cn("text-xs truncate font-bold", isDarkMode ? "text-emerald-400/80" : "text-emerald-600/70")}>Private AI Chat</p>
                      </div>
                    </motion.div>

                    <motion.div 
                      variants={sidebarItemVariants}
                      initial="initial"
                      animate="animate"
                      onClick={() => {
                        setActiveTab('blind');
                        setActiveFeed('chat');
                        setSelectedUser(null);
                        setSelectedGroup(null);
                        markMessagesAsRead('blind');
                        if (window.innerWidth < 768) setShowSidebar(false);
                      }}
                      className={cn(
                        "flex items-center gap-5 p-4 rounded-[2rem] transition-all cursor-pointer group relative border border-transparent",
                        activeTab === 'blind'
                          ? (isDarkMode ? "bg-purple-500/10 border-purple-500/20" : "bg-purple-50 border-purple-100")
                          : (isDarkMode ? "hover:bg-slate-800/50 hover:border-slate-700" : "hover:bg-white hover:shadow-lg hover:shadow-slate-200/50")
                      )}
                    >
                      <div className="relative">
                        <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20 group-hover:rotate-12 transition-transform">
                          <Ghost className="w-7 h-7" />
                        </div>
                        <NotificationBadge 
                          count={unreadMessageCounts.get('blind') || 0} 
                          isDarkMode={isDarkMode} 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className={cn("font-black text-sm tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>BLIND CHAT</span>
                          <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded", isDarkMode ? "text-purple-300 bg-purple-500/30" : "text-purple-600 bg-purple-200/50")}>NEW</span>
                        </div>
                        <p className={cn("text-xs truncate font-bold", isDarkMode ? "text-purple-400/80" : "text-purple-600/70")}>Anonymous Global Chat</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Groups Section */}
                  
                  <div className="px-4 mb-6">
                    <h3 className={cn("text-[9px] font-black uppercase tracking-[0.4em] mb-4 px-2", isDarkMode ? "text-slate-500" : "text-slate-400")}>Groups</h3>
                    <div className="space-y-2">
                      {groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())).map((g, idx) => (
                        <motion.div 
                          key={g._id}
                          variants={sidebarItemVariants}
                          initial="initial"
                          animate="animate"
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => {
                            setSelectedGroup(g);
                            setActiveFeed('chat');
                            setSelectedUser(null);
                            setActiveTab('all');
                            markMessagesAsRead('group', g._id);
                            propSocket?.emit('join group', g._id);
                            if (window.innerWidth < 768) setShowSidebar(false);
                          }}
                          className={cn(
                            "flex items-center gap-5 p-4 rounded-[2rem] transition-all cursor-pointer group relative border border-transparent",
                            selectedGroup?._id === g._id
                              ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100")
                              : (isDarkMode ? "hover:bg-slate-800/50 hover:border-slate-700" : "hover:bg-white hover:shadow-lg hover:shadow-slate-200/50")
                          )}
                        >
                          <div className="relative">
                            <div className="w-14 h-14 overflow-hidden border-2 border-white dark:border-slate-700 rounded-2xl relative">
                              <AnimatedAvatar username={g.name} size={56} profilePic={g.pic} />
                              {g.isVerified && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <NotificationBadge 
                              count={unreadMessageCounts.get(`group_${g._id}`) || 0} 
                              isDarkMode={isDarkMode} 
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn("text-sm font-black truncate tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>{g.name}</p>
                              {g.isVerified && (
                                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-bold rounded-full">✅</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate font-bold">{g.members.length} members</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Friends Section */}
                  <div className="px-4 mb-6">
                    <h3 className={cn("text-[9px] font-black uppercase tracking-[0.4em] mb-4 px-2", isDarkMode ? "text-slate-500" : "text-slate-400")}>Friends</h3>
                    <div className="space-y-2">
                      {friends.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((f, idx) => {
                        const isFriendOnline = onlineUsers.some(u => u._id === f._id);
                        return (
                          <motion.div 
                            key={f._id}
                            variants={sidebarItemVariants}
                            initial="initial"
                            animate="animate"
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => {
                              setSelectedUser({...f, isOnline: isFriendOnline});
                              setActiveFeed('chat');
                              setSelectedGroup(null);
                              setActiveTab('all');
                              markMessagesAsRead('user', f._id);
                              if (window.innerWidth < 768) setShowSidebar(false);
                            }}
                            className={cn(
                              "flex items-center gap-5 p-4 rounded-[2rem] transition-all cursor-pointer group relative border border-transparent",
                              selectedUser?._id === f._id
                                ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100")
                                : (isDarkMode ? "hover:bg-slate-800/50 hover:border-slate-700" : "hover:bg-white hover:shadow-lg hover:shadow-slate-200/50")
                            )}
                          >
                            <div className="relative">
                              <div className="w-14 h-14 border-2 border-white dark:border-slate-700 rounded-2xl overflow-hidden">
                                <AnimatedAvatar username={f.name} size={56} user={f} />
                              </div>
                              {/* Online Status Indicator */}
                              {isFriendOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                </div>
                              )}
                              <NotificationBadge 
                                count={unreadMessageCounts.get(`user_${f._id}`) || 0} 
                                isDarkMode={isDarkMode} 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={cn("text-sm font-black truncate tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>{f.name}</p>
                                {verifiedUsers.has(f._id) && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                      <Check className="w-2.5 h-2.5 text-white" />
                                    </div>
                                    <span className="text-[8px] text-emerald-500 font-bold">Verified</span>
                                  </div>
                                )}
                                {suspiciousUsers.has(f._id) && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                      <AlertTriangle className="w-2.5 h-2.5 text-white" />
                                    </div>
                                    <span className="text-[8px] text-red-500 font-bold">Suspicious</span>
                                  </div>
                                )}
                              </div>
                              {/* Last message preview or typing indicator */}
                              <div className="flex items-center gap-1">
                                {typingUsers.has(f.name) ? (
                                  <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                                    <span className="flex gap-0.5">
                                      <span className="w-1 h-1 bg-emerald-500 rounded-full typing-dot" />
                                      <span className="w-1 h-1 bg-emerald-500 rounded-full typing-dot" />
                                      <span className="w-1 h-1 bg-emerald-500 rounded-full typing-dot" />
                                    </span>
                                    typing...
                                  </span>
                                ) : (
                                  <p className={cn("text-xs truncate font-medium", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                    {lastMessages.get(`user_${f._id}`)?.isMe && (
                                      <span className="text-emerald-500 mr-1">You:</span>
                                    )}
                                    {lastMessages.get(`user_${f._id}`)?.text || (isFriendOnline ? "Online" : "Friend")}
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* Pin button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinChat(`user_${f._id}`);
                              }}
                              className={cn(
                                "p-2 rounded-full transition-all opacity-0 group-hover:opacity-100",
                                pinnedChats.has(`user_${f._id}`) 
                                  ? "text-amber-500 opacity-100" 
                                  : "text-slate-400 hover:text-amber-500 hover:bg-amber-500/10"
                              )}
                            >
                              <Star className={cn("w-4 h-4", pinnedChats.has(`user_${f._id}`) && "fill-current")} />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Users Section */}
                  <div className="px-4">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 px-2">Network</h3>
                    <div className="space-y-2">
                      {/* Global Chat Node */}
                      <motion.div 
                        variants={sidebarItemVariants}
                        initial="initial"
                        animate="animate"
                        onClick={() => {
                          setSelectedUser(null);
                          setSelectedGroup(null);
                          setActiveTab('all');
                          markMessagesAsRead('global');
                          if (window.innerWidth < 768) setShowSidebar(false);
                        }}
                        className={cn(
                          "flex items-center gap-5 p-4 rounded-[2rem] transition-all cursor-pointer group relative border border-transparent",
                          !selectedUser && !selectedGroup && activeTab !== 'ai'
                            ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100")
                            : (isDarkMode ? "hover:bg-slate-800/50 hover:border-slate-700" : "hover:bg-white hover:shadow-lg hover:shadow-slate-200/50")
                        )}
                      >
                        <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:rotate-12 transition-transform relative">
                          <Globe className="w-7 h-7" />
                          <NotificationBadge 
                            count={unreadMessageCounts.get('global') || 0} 
                            isDarkMode={isDarkMode} 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-black truncate tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>GLOBAL NETWORK</p>
                          <p className="text-xs text-emerald-500 font-bold">Public Node</p>
                        </div>
                      </motion.div>

                      {friends.filter(u => u._id !== user._id && u.name.toLowerCase().includes(searchQuery.toLowerCase())).map((u, idx) => (
                        <motion.div 
                          key={u._id} 
                          variants={sidebarItemVariants}
                          initial="initial"
                          animate="animate"
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => { 
                            setSelectedUser(u);
                            setSelectedGroup(null);
                            setActiveTab('all');
                            markMessagesAsRead('user', u._id);
                            if (window.innerWidth < 768) setShowSidebar(false); 
                          }}
                          className={cn(
                            "flex items-center gap-5 p-4 rounded-[2rem] transition-all cursor-pointer group relative border border-transparent",
                            selectedUser?._id === u._id 
                              ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100")
                              : (isDarkMode ? "hover:bg-slate-800/50 hover:border-slate-700" : "hover:bg-white hover:shadow-lg hover:shadow-slate-200/50")
                          )}
                        >
                          <div className="relative">
                            <div className="w-14 h-14 rounded-2xl border-2 border-white shadow-sm group-hover:scale-110 transition-all overflow-hidden">
                              <AnimatedAvatar username={u.name} size={56} user={u} />
                            </div>
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-white shadow-sm",
                              u.isOnline ? "bg-emerald-500" : "bg-slate-400"
                            )}></div>
                            <NotificationBadge 
                              count={unreadMessageCounts.get(`user_${u._id}`) || 0} 
                              isDarkMode={isDarkMode} 
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <p className={cn("text-sm font-black truncate tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>{u.name}</p>
                                {verifiedUsers.has(u._id) && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                      <Check className="w-2.5 h-2.5 text-white" />
                                    </div>
                                    <span className="text-[8px] text-emerald-500 font-bold">Verified</span>
                                  </div>
                                )}
                                {suspiciousUsers.has(u._id) && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                      <AlertTriangle className="w-2.5 h-2.5 text-white" />
                                    </div>
                                    <span className="text-[8px] text-red-500 font-bold">Suspicious</span>
                                  </div>
                                )}
                              </div>
                              {!friends.some(f => f._id === u._id) && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendFriendRequest(u._id);
                                  }}
                                  className="text-[9px] font-black text-emerald-500 uppercase tracking-widest hover:bg-emerald-500/10 px-2 py-1 rounded transition-all"
                                >
                                  Add Friend
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate font-bold">
                              {typingUsers.has(u.name) ? (
                                <span className="text-emerald-500 italic flex items-center gap-1">
                                  <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 0.4, repeat: Infinity }}
                                    className="w-1 h-1 bg-emerald-500 rounded-full"
                                  />
                                  typing...
                                </span>
                              ) : (
                                u.isOnline ? "Active now" : `Last seen ${u.lastSeen ? new Date(u.lastSeen).toLocaleDateString() : 'recently'}`
                              )}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Live Panel */}
                  <div className="mt-6 px-4 pb-6">
                    <LiveOnlinePanel
                      socket={propSocket}
                      currentUser={user}
                      isDarkMode={isDarkMode}
                      onStartChat={(onlineUser) => {
                        // Find the user from allUsers, fallback to the live-panel user if needed
                        const foundUser = allUsers.find(u => u._id === onlineUser.userId);
                        const userToSelect = foundUser || ({
                          _id: onlineUser.userId || onlineUser.name,
                          name: onlineUser.name,
                          email: '',
                          pic: onlineUser.pic || '',
                          isOnline: onlineUser.isOnline,
                          lastSeen: onlineUser.lastSeen
                        } as UserType);
                        setSelectedUser(userToSelect);
                        setSelectedGroup(null);
                        setActiveTab('all');
                      }}
                    />
                  </div>
                  
                </div>
              </div>
            </div>
            </motion.aside>
              </>
          )}
        </AnimatePresence>

        {/* Chat Main Area */}
        <section className={cn(
          "flex-1 flex-col relative min-w-0 transition-all duration-500 h-full min-h-0 overflow-hidden",
          showChat ? "flex" : "hidden md:flex",
          isDarkMode ? "bg-slate-950 md:border-l border-slate-800/50" : "bg-slate-50 md:border-l border-slate-200/80"
        )}>
                    {/* Notifications */}
          <AnimatePresence>
            {appNotifications.map(notification => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className={cn(
                  "fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl",
                  notification.type === 'success' 
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-500"
                    : notification.type === 'error'
                    ? "bg-red-500/20 border-red-500/50 text-red-500"
                    : "bg-blue-500/20 border-blue-500/50 text-blue-500"
                )}
              >
                <p className="text-sm font-bold">{notification.message}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className={cn("absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20", isDarkMode ? "bg-emerald-500" : "bg-emerald-300")}></div>
            <div className={cn("absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20", isDarkMode ? "bg-blue-500" : "bg-blue-300")}></div>
            <div className={cn(
              "absolute inset-0 opacity-[0.02]",
              isDarkMode ? "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" : "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"
            )}></div>
          </div>
          {!selectedUser && !selectedGroup && activeTab !== 'ai' && activeTab !== 'blind' && activeFeed !== 'reels' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className={cn(
                "w-24 h-24 rounded-[3rem] flex items-center justify-center mb-8 shadow-2xl",
                isDarkMode ? "bg-slate-900 shadow-slate-900/50" : "bg-white shadow-slate-200"
              )}>
                <MessageSquare className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className={cn("text-3xl md:text-4xl font-black tracking-tight mb-4", isDarkMode ? "text-white" : "text-slate-900")}>
                START CHATS
              </h2>
              <p className="text-slate-500 font-bold max-w-md">
                Select a person or group from the sidebar to start messaging. You can also chat with the AI Assistant.
              </p>
              <button 
                onClick={() => setShowSidebar(true)} 
                className="mt-8 px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform md:hidden"
              >
                Open Sidebar
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className={cn(
                "backdrop-blur-2xl px-3 md:px-6 py-3 md:py-4 border-b flex items-center justify-between sticky top-0 z-10 transition-all duration-500",
                isDarkMode
                  ? "bg-gradient-to-r from-slate-950/80 via-slate-900/80 to-slate-950/80 border-slate-800/60 shadow-2xl shadow-black/20"
                  : "bg-gradient-to-r from-white/80 via-slate-50/80 to-white/80 border-slate-200/60 shadow-lg shadow-slate-200/50"
              )}>
            <div className="flex items-center gap-3 md:gap-6 overflow-hidden">
              <motion.button
                whileHover={{ scale: 1.1, x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSidebar(!showSidebar)}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300 shadow-md",
                  isDarkMode
                    ? "text-slate-300 hover:text-white hover:bg-slate-800/80 bg-slate-900/50 border border-slate-700/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white bg-slate-100/80 border border-slate-200/50"
                )}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "w-11 h-11 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-xl transition-all duration-300 relative overflow-hidden",
                  isDarkMode
                    ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-500/30"
                    : "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 shadow-slate-900/20"
                )}
              >
                {/* Animated shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <MessageSquare className="w-5 h-5 md:w-7 md:h-7 relative z-10" />
              </motion.div>
              <div className="min-w-0">
                <motion.h2
                  animate={{
                    textShadow: isGhostMode ? [
                      "0 0 4px rgba(16,185,129,0.4)",
                      "0 0 12px rgba(16,185,129,0.8)",
                      "0 0 4px rgba(16,185,129,0.4)"
                    ] : "0 2px 10px rgba(0,0,0,0.1)"
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn(
                    "font-black text-lg md:text-2xl tracking-tight truncate bg-clip-text",
                    isDarkMode
                      ? "text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]"
                      : "text-slate-900 drop-shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                  )}
                >
                  {activeFeed === 'reels'
                    ? 'REELS'
                    : selectedGroup
                      ? selectedGroup.name.toUpperCase()
                      : (selectedUser
                        ? selectedUser.name.toUpperCase()
                        : (activeTab === 'ai' ? "MY ASSISTANT" : (activeTab === 'blind' ? "BLIND CHAT" : "GLOBAL CHAT")))}
                </motion.h2>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shadow-lg",
                      (selectedUser ? selectedUser.isOnline : true)
                        ? "bg-emerald-500 shadow-emerald-500/60"
                        : "bg-slate-400 shadow-slate-400/40"
                    )}
                  />
                  <p className={cn(
                    "text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]",
                    isDarkMode ? "text-emerald-400" : "text-emerald-600"
                  )}>
                    {activeFeed === 'reels'
                      ? `${reels.length} Reels`
                      : selectedGroup
                        ? `${selectedGroup.members.length} Members`
                        : (selectedUser
                          ? (selectedUser.isOnline ? "● Online" : `Last seen ${selectedUser.lastSeen ? new Date(selectedUser.lastSeen).toLocaleTimeString() : 'recently'}`)
                          : (activeTab === 'ai' ? "◉ AI Ready" : (activeTab === 'blind' ? "◉ Anonymous Mode" : `◉ ${onlineUsers.length} Nodes Active`)))}
                  </p>
                </div>
              </div>
            </div>
            {activeFeed !== 'reels' && (
              <div className="flex items-center gap-2 md:gap-3">
                {/* Main Actions - Search, Video Call, Voice Call */}
                <div className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl backdrop-blur-sm border border-slate-200/30 dark:border-slate-700/30">
                  <motion.button
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowChatSearch(!showChatSearch)}
                    className={cn(
                      "p-2.5 md:p-3 rounded-xl transition-all duration-300",
                      showChatSearch
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                        : (isDarkMode
                            ? "text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                            : "text-slate-500 hover:text-emerald-600 hover:bg-white")
                    )}
                    title="Search in conversation"
                  >
                    <Search className="w-4 h-4 md:w-5 md:h-5" />
                  </motion.button>
                  {activeTab !== 'ai' && activeTab !== 'blind' && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.08, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => startCall('video')}
                        className={cn(
                          "p-2.5 md:p-3 rounded-xl transition-all duration-300",
                          isDarkMode
                            ? "text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                            : "text-slate-500 hover:text-emerald-600 hover:bg-white"
                        )}
                        title="Video Call"
                      >
                        <Video className="w-4 h-4 md:w-5 md:h-5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.08, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => startCall('audio')} 
                        className={cn(
                          "p-2.5 md:p-3 rounded-xl transition-all duration-300",
                          isDarkMode
                            ? "text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                            : "text-slate-500 hover:text-emerald-600 hover:bg-white"
                        )}
                        title="Voice Call"
                      >
                        <Phone className="w-4 h-4 md:w-5 md:h-5" />
                      </motion.button>
                    </>
                  )}
                </div>

                {/* Three Dot Menu - All other options inside */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowInfoMenu(!showInfoMenu)}
                    className={cn(
                      "p-2.5 md:p-3 rounded-xl transition-all duration-300 shadow-lg backdrop-blur-sm border",
                      isDarkMode
                        ? "bg-slate-900/80 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/90 border-slate-700/50 hover:border-emerald-500/30 hover:shadow-emerald-500/20"
                        : "bg-white/80 text-slate-500 hover:text-emerald-600 hover:bg-white border-slate-200/50 hover:border-emerald-500/30 hover:shadow-emerald-500/20"
                    )}
                    title="More Options"
                  >
                    <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
                  </motion.button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showInfoMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className={cn(
                          "absolute top-full mt-2 right-0 z-50 min-w-[200px] rounded-xl border shadow-lg overflow-hidden",
                          isDarkMode
                            ? "bg-slate-800 border-slate-700 shadow-slate-900/50"
                            : "bg-white border-slate-200 shadow-slate-100/50"
                        )}
                      >
                        {/* Group Info */}
                        {selectedGroup && (
                          <button
                            onClick={() => {
                              setShowGroupInfo(true);
                              setShowInfoMenu(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                              isDarkMode
                                ? "hover:bg-slate-700 text-slate-200"
                                : "hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <Info className="w-4 h-4" />
                            Group Info
                          </button>
                        )}

                        {/* Add Member - Admin only */}
                        {selectedGroup && (selectedGroup.admin === user._id || (typeof selectedGroup.admin === 'object' && selectedGroup.admin._id === user._id)) && (
                          <button
                            onClick={() => {
                              setShowAddMemberModal(true);
                              setShowInfoMenu(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                              isDarkMode
                                ? "hover:bg-slate-700 text-emerald-400"
                                : "hover:bg-slate-50 text-emerald-600"
                            )}
                          >
                            <Plus className="w-4 h-4" />
                            Add Member
                          </button>
                        )}

                        {/* Exit Group */}
                        {selectedGroup && (
                          <button
                            onClick={() => {
                              handleExitGroup(selectedGroup._id);
                              setShowInfoMenu(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                              isDarkMode
                                ? "hover:bg-red-500/20 text-red-400"
                                : "hover:bg-red-50 text-red-600"
                            )}
                          >
                            <LogOut className="w-4 h-4" />
                            Exit Group
                          </button>
                        )}

                        {/* Delete Group - Admin only */}
                        {selectedGroup && (selectedGroup.admin === user._id || (typeof selectedGroup.admin === 'object' && selectedGroup.admin._id === user._id)) && (
                          <button
                            onClick={() => {
                              handleDeleteGroup(selectedGroup._id);
                              setShowInfoMenu(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                              isDarkMode
                                ? "hover:bg-red-500/20 text-red-400"
                                : "hover:bg-red-50 text-red-600"
                            )}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Group
                          </button>
                        )}

                        {/* Clear Chat */}
                        <button
                          onClick={() => {
                            handleDeleteAllMessages();
                            setShowInfoMenu(false);
                          }}
                          className={cn(
                            "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                            isDarkMode
                              ? "hover:bg-orange-500/20 text-orange-400"
                              : "hover:bg-orange-50 text-orange-600"
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear Chat
                        </button>

                        {/* Remove Friend - Only for user chat */}
                        {selectedUser && (
                          <button
                            onClick={() => {
                              handleDeletePerson(selectedUser._id);
                              setShowInfoMenu(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                              isDarkMode
                                ? "hover:bg-red-500/20 text-red-400"
                                : "hover:bg-red-50 text-red-600"
                            )}
                          >
                            <UserMinus className="w-4 h-4" />
                            Remove Friend
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className={cn("w-px h-6 mx-1", isDarkMode ? "bg-slate-800" : "bg-slate-200")}></div>
              <div className="relative summary-options-container">
                <button 
                  onClick={() => setShowSummaryOptions(!showSummaryOptions)}
                  disabled={isSummarizing || messages.length < 1}
                  className={cn(
                    "flex items-center gap-2 px-3 md:px-4 py-2 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-md group",
                    isDarkMode 
                      ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/40" 
                      : "bg-slate-900 text-white hover:bg-emerald-600 shadow-slate-900/20"
                  )}
                >
                  {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />}
                  <span className="hidden md:inline">Summarize</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showSummaryOptions ? "rotate-180" : "")} />
                </button>
                
                {/* Summary Options Dropdown */}
                <AnimatePresence>
                  {showSummaryOptions && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className={cn(
                        "absolute top-full mt-2 right-0 z-50 min-w-[180px] rounded-xl border shadow-lg overflow-hidden",
                        isDarkMode 
                          ? "bg-slate-800 border-slate-700 shadow-slate-900/50" 
                          : "bg-white border-slate-200 shadow-slate-100/50"
                      )}
                    >
                      <button
                        onClick={() => {
                          setSummaryOption('today');
                          summarizeChat();
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center gap-2",
                          isDarkMode 
                            ? "hover:bg-slate-700 text-slate-200" 
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <Sun className="w-3 h-3" />
                        Today's Messages
                      </button>
                      <button
                        onClick={() => {
                          setSummaryOption('yesterday');
                          summarizeChat();
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center gap-2",
                          isDarkMode 
                            ? "hover:bg-slate-700 text-slate-200" 
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <Moon className="w-3 h-3" />
                        Yesterday's Messages
                      </button>
                      <button
                        onClick={() => {
                          setSummaryOption('unread');
                          summarizeChat();
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center gap-2",
                          isDarkMode 
                            ? "hover:bg-slate-700 text-slate-200" 
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <Bell className="w-3 h-3" />
                        Unread Messages
                      </button>
                      <button
                        onClick={() => {
                          setSummaryOption('entire');
                          summarizeChat();
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center gap-2",
                          isDarkMode 
                            ? "hover:bg-slate-700 text-slate-200" 
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <FileText className="w-3 h-3" />
                        Entire Chat
                      </button>
                      <div className={cn("border-t", isDarkMode ? "border-slate-700" : "border-slate-200")}>
                        <button
                          onClick={() => {
                            setSummaryOption('custom');
                            // Focus on date input after a short delay
                            setTimeout(() => {
                              const dateInput = document.getElementById('custom-date-input') as HTMLInputElement;
                              if (dateInput) dateInput.focus();
                            }, 100);
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center gap-2",
                            isDarkMode 
                              ? "hover:bg-slate-700 text-slate-200" 
                              : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <Calendar className="w-3 h-3" />
                          Custom Date
                        </button>
                        {summaryOption === 'custom' && (
                          <div className="px-3 py-2">
                            <input
                              id="custom-date-input"
                              type="date"
                              value={customDate}
                              onChange={(e) => setCustomDate(e.target.value)}
                              className={cn(
                                "w-full px-2 py-1 text-xs rounded border",
                                isDarkMode 
                                  ? "bg-slate-700 border-slate-600 text-white" 
                                  : "bg-white border-slate-300 text-slate-900"
                              )}
                              max={new Date().toISOString().split('T')[0]}
                            />
                            {customDate && (
                              <button
                                onClick={() => {
                                  if (customDate) {
                                    summarizeChat();
                                  }
                                }}
                                className={cn(
                                  "w-full mt-2 px-2 py-1 text-xs font-medium rounded transition-colors",
                                  isDarkMode 
                                    ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                                )}
                              >
                                Summarize Selected Date
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                                          </motion.div>
                  )}
                </AnimatePresence>
              </div>
                          </div>
            )}
          </div>

          {/* Chat Search Bar */}
          <AnimatePresence>
            {showChatSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "px-4 py-3 border-b flex items-center gap-3",
                  isDarkMode 
                    ? "bg-slate-900/80 border-slate-800 backdrop-blur-xl" 
                    : "bg-white/80 border-slate-200 backdrop-blur-xl"
                )}
              >
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => {
                    setChatSearchQuery(e.target.value);
                    searchInChat(e.target.value);
                  }}
                  placeholder="Search in conversation..."
                  className={cn(
                    "flex-1 bg-transparent outline-none text-sm",
                    isDarkMode ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                  )}
                />
                {searchResults.length > 0 && (
                  <span className="text-xs text-slate-500">
                    {currentSearchIndex + 1} / {searchResults.length}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigateSearchResult('prev')}
                    disabled={searchResults.length === 0}
                    className="p-1.5 rounded-lg hover:bg-slate-500/10 disabled:opacity-30 transition-all"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigateSearchResult('next')}
                    disabled={searchResults.length === 0}
                    className="p-1.5 rounded-lg hover:bg-slate-500/10 disabled:opacity-30 transition-all"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowChatSearch(false);
                    setChatSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-500/10 transition-all"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Advanced Messages Area with Glassmorphism */}
          <div 
            id="messages-container"
            ref={chatContainerRef}
            onScroll={handleScroll}
            className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 transition-all duration-500 custom-scrollbar relative h-0 min-h-0",
            isDarkMode 
              ? "bg-gradient-to-b from-slate-950/40 via-slate-900/30 to-slate-950/40 backdrop-blur-xl" 
              : "bg-gradient-to-b from-white/30 via-slate-50/20 to-white/40 backdrop-blur-xl"
          )}
            style={{
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
              scrollbarColor: isDarkMode ? 'rgba(148,163,184,0.3) transparent' : 'rgba(148,163,184,0.4) transparent'
            }}
          >
            {/* Floating Scroll-to-Bottom Button */}
            <AnimatePresence>
              {showScrollButton && (
                <motion.button
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={scrollToBottom}
                  className={cn(
                    "fixed bottom-32 right-8 z-50 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 border-2 backdrop-blur-md",
                    isDarkMode
                      ? "bg-slate-800/90 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20 hover:bg-slate-700/90"
                      : "bg-white/90 border-emerald-500/50 text-emerald-600 shadow-emerald-500/20 hover:bg-slate-50/90"
                  )}
                >
                  <ChevronDown className="w-6 h-6 animate-bounce" />
                  {messages.length > 0 && messages[messages.length - 1].senderId !== user?._id && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white animate-pulse">
                      1
                    </span>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
                          {(() => {
                // Use pre-computed grouped data from useMemo
                const { systemMessages, dateGroups } = groupedChatData;
                
                return (
                  <div className="flex flex-col space-y-6">
                    {/* Render system messages with enhanced styling - stable keys only */}
                    {systemMessages.map((msg) => (
                      <div 
                        key={`system-${msg.id || msg.timestamp}`} 
                        className="flex justify-center my-4"
                      >
                        <div className={cn(
                          "flex items-center gap-2 px-5 py-2 rounded-full shadow-lg border backdrop-blur-md",
                          isDarkMode 
                            ? "bg-slate-800/80 border-slate-700/50 shadow-slate-900/30" 
                            : "bg-white/90 border-slate-200/50 shadow-slate-200/30"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full animate-pulse",
                            isDarkMode ? "bg-emerald-400" : "bg-emerald-500"
                          )} />
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em]",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            {msg.text}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Render grouped messages with date separators */}
                    {dateGroups.map(([dateGroup, dateMessages], groupIdx) => {
                      const unreadMessages = getUnreadMessages(dateMessages);
                      
                      return (
                        <React.Fragment key={`group-${dateGroup}-${groupIdx}`}>
                          <DateSeparator 
                            date={dateGroup} 
                            unreadCount={unreadMessages.length} 
                          />
                          
                          {dateMessages.map((msg) => {
                const isMe = msg.senderId === user._id || msg.user === user?.name;
                return (
                  <div
                    key={msg.id || `msg-${msg.timestamp}-${msg.user}`}
                    id={msg.id ? `msg-${msg.id}` : undefined}
                    className={cn(
                      "flex gap-3 max-w-[95%] md:max-w-[80%] lg:max-w-[70%] mb-4 group",
                      isMe ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className={cn(
                          "w-9 h-9 md:w-10 md:h-10 rounded-full border-2 shadow-lg overflow-hidden flex items-center justify-center transition-all duration-300",
                          isDarkMode
                            ? "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 shadow-slate-900/40"
                            : "bg-gradient-to-br from-white to-slate-100 border-slate-300 shadow-slate-300/40",
                          isMe && (isDarkMode ? "ring-2 ring-emerald-500/30" : "ring-2 ring-emerald-500/20")
                        )}
                      >
                        <AnimatedAvatar username={msg.user} size={36} profilePic={msg.profilePic} />
                      </div>
                    </div>
                    
                    <div className={cn(
                      "flex flex-col",
                      isMe ? "items-end" : "items-start"
                    )}>
                      <div className="flex items-center gap-2 mb-1 px-2">
                        {!isMe && !msg.isAI && <span className={cn("text-[11px] font-medium", isDarkMode ? "text-slate-300" : "text-slate-600")}>{msg.user}</span>}
                        <span className="text-[10px] text-slate-400">
                          {formatMessageTime(msg.timestamp)}
                        </span>
                        {/* Scheduled message badge - only show to sender */}
                        {isMe && msg.isScheduled && msg.scheduledTime && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            Scheduled for {new Date(msg.scheduledTime).toLocaleString()}
                          </span>
                        )}
                        {isMe && (
                          <div className="flex items-center gap-1" title={msg.readAt ? `Read at ${new Date(msg.readAt).toLocaleTimeString()}` : msg.deliveredAt ? 'Delivered' : 'Sent'}>
                            {/* Determine message status - use both status and deliveryStatus fields */}
                            {(() => {
                              const hasReadBy = msg.readBy && msg.readBy.length > 0;
                              const messageStatus = msg.status || msg.deliveryStatus || 'sent';
                              const isRead = hasReadBy || messageStatus === 'read' || msg.read;
                              const isDelivered = messageStatus === 'delivered' || msg.delivered || msg.deliveredAt;
                              
                              if (isRead) {
                                // Read (Blue Double Check) - Message read by recipient
                                return (
                                  <div className="flex items-center">
                                    <CheckCheck className="w-3 h-3 text-blue-400" />
                                  </div>
                                );
                              } else if (isDelivered) {
                                // Delivered (Grey Double Check) - Message delivered but not read
                                return (
                                  <div className="flex items-center">
                                    <Check className="w-3 h-3 text-slate-400" />
                                    <Check className="w-3 h-3 text-slate-400 -ml-1.5" />
                                  </div>
                                );
                              } else {
                                // Sent (Single Grey Check) - Message sent but not delivered
                                return <Check className="w-3 h-3 text-slate-400" />;
                              }
                            })()}
                          </div>
                        )}
                      </div>
                      
                      <div
                        className={cn(
                          "relative px-4 py-2.5 md:px-5 md:py-3 rounded-[1.5rem] shadow-lg group transition-all duration-300 border backdrop-blur-sm max-w-full overflow-hidden",
                          isMe
                            ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-500 text-white rounded-tr-md border-white/20 shadow-emerald-500/30"
                            : msg.isAI
                              ? "bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-tl-md shadow-slate-900/40 border-indigo-500/30"
                              : isDarkMode
                                ? "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-slate-100 rounded-tl-md border-slate-600/40 shadow-slate-900/30"
                                : "bg-gradient-to-br from-white via-slate-50 to-white text-slate-800 rounded-tl-md border-slate-200/60 shadow-slate-200/40",
                          msg.isGhost && "ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-transparent shadow-[0_0_20px_rgba(16,185,129,0.4)]",
                          isMe && msg.isScheduled && msg.status === 'scheduled' && "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-transparent shadow-[0_0_20px_rgba(245,158,11,0.3)] border-amber-500/50"
                        )}
                      >
                        {/* Subtle gradient overlay for depth */}
                        <div className={cn(
                          "absolute inset-0 rounded-[1.5rem] opacity-30 pointer-events-none",
                          isMe
                            ? "bg-gradient-to-tr from-white/20 via-transparent to-transparent"
                            : "bg-gradient-to-br from-white/10 via-transparent to-transparent"
                        )} />
                        {msg.isGhost && (
                          <div className="absolute -top-4 -right-4 w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-20">
                            <Ghost className="w-5 h-5 text-emerald-400 animate-pulse" />
                            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-[8px] font-black px-1.5 py-0.5 rounded-full text-white">
                              {Math.max(0, 60 - Math.floor((Date.now() - new Date(msg.timestamp).getTime()) / 1000))}s
                            </div>
                          </div>
                        )}
                        
                        {/* Forwarded Message Badge */}
                        {msg.isForwarded && msg.forwardedFrom && (
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                            <div className="flex items-center gap-1.5">
                              <Forward className="w-3 h-3 text-emerald-400" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                Forwarded from {msg.forwardedFrom}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {msg.isAI && (
                          <div className="flex items-center gap-3 mb-4 pb-2 border-b border-white/10">
                            <div className="w-5 h-5 bg-emerald-500/20 rounded flex items-center justify-center">
                              <Bot className="w-3 h-3 text-emerald-400" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">AI Assistant</span>
                          </div>
                        )}
                        
                        {msg.image && (
                          <div className={cn(
                            "mb-6 rounded-[2rem] overflow-hidden shadow-2xl border-4 transition-all hover:scale-[1.02]",
                            isDarkMode ? "border-slate-700" : "border-white"
                          )}>
                            <img 
                              src={msg.image} 
                              alt="Shared" 
                              className="w-full h-auto max-h-[500px] object-cover cursor-pointer"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {msg.video && (
                          <div className={cn(
                            "mb-6 rounded-[2rem] overflow-hidden shadow-2xl border-4 transition-all hover:scale-[1.02]",
                            isDarkMode ? "border-slate-700" : "border-white"
                          )}>
                            <video
                              src={msg.video}
                              controls
                              playsInline
                              className="w-full max-h-[520px] object-contain bg-black"
                            />
                          </div>
                        )}

                        {msg.audio && (
                          <div className="mb-4 flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                            <button 
                              onClick={() => {
                                const audio = new Audio(msg.audio);
                                audio.play().catch(e => console.error("Voice message play failed", e));
                              }}
                              className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                            >
                              <Play className="w-5 h-5 ml-1" />
                            </button>
                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-400">VOICE MESSAGE</span>
                                <Volume2 className="w-3 h-3 text-emerald-400" />
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-6 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full w-3/4 bg-gradient-to-r from-emerald-500/30 to-emerald-500/60 rounded-full animate-pulse" />
                                </div>
                                <span className="text-xs text-slate-400">0:15</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Reel Display - Enhanced with Premium UI */}
                        {msg.reelData && (
                          <div className="mb-4">
                            <ReelPreviewCard
                              reel={{
                                _id: msg.reelData._id,
                                caption: msg.reelData.caption,
                                mediaUrl: msg.reelData.mediaUrl,
                                mediaType: msg.reelData.mediaType,
                                createdBy: msg.reelData.createdBy,
                                createdByName: msg.senderId === user?._id ? user?.name : msg.user,
                                createdAt: msg.reelData.createdAt,
                                likes: msg.reelData.likes || [],
                                comments: msg.reelData.comments || [],
                              }}
                              isDarkMode={isDarkMode}
                              compact={true}
                              onClick={() => setViewingReel({
                                _id: msg.reelData._id,
                                caption: msg.reelData.caption,
                                mediaUrl: msg.reelData.mediaUrl,
                                mediaType: msg.reelData.mediaType,
                                createdBy: msg.reelData.createdBy,
                                createdByName: msg.senderId === user?._id ? user?.name : msg.user,
                                createdAt: msg.reelData.createdAt,
                                likes: msg.reelData.likes || [],
                                comments: msg.reelData.comments || [],
                              } as Reel)}
                              onWatchTogether={() => openWatchTogether({
                                _id: msg.reelData._id,
                                caption: msg.reelData.caption,
                                mediaUrl: msg.reelData.mediaUrl,
                                mediaType: msg.reelData.mediaType,
                                createdBy: msg.reelData.createdBy,
                                createdByName: msg.senderId === user?._id ? user?.name : msg.user,
                                createdAt: msg.reelData.createdAt,
                                likes: msg.reelData.likes || [],
                                comments: msg.reelData.comments || [],
                              } as Reel)}
                              onRepostToStory={() => openRepostModal({
                                _id: msg.reelData._id,
                                caption: msg.reelData.caption,
                                mediaUrl: msg.reelData.mediaUrl,
                                mediaType: msg.reelData.mediaType,
                                createdBy: msg.reelData.createdBy,
                                createdByName: msg.senderId === user?._id ? user?.name : msg.user,
                                createdAt: msg.reelData.createdAt,
                                likes: msg.reelData.likes || [],
                                comments: msg.reelData.comments || [],
                              } as Reel)}
                              currentUser={user}
                            />
                            
                            {/* Quick Actions Bar */}
                            <div className="flex items-center gap-2 mt-2 px-1">
                              <button
                                onClick={() => openWatchTogether({
                                  _id: msg.reelData._id,
                                  caption: msg.reelData.caption,
                                  mediaUrl: msg.reelData.mediaUrl,
                                  mediaType: msg.reelData.mediaType,
                                  createdBy: msg.reelData.createdBy,
                                  createdByName: msg.senderId === user?._id ? user?.name : msg.user,
                                  createdAt: msg.reelData.createdAt,
                                  likes: msg.reelData.likes || [],
                                  comments: msg.reelData.comments || [],
                                } as Reel)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all btn-glow-emerald",
                                  isDarkMode
                                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                )}
                              >
                                <Play className="w-3.5 h-3.5" />
                                Watch Together
                              </button>
                              <button
                                onClick={() => openRepostModal({
                                  _id: msg.reelData._id,
                                  caption: msg.reelData.caption,
                                  mediaUrl: msg.reelData.mediaUrl,
                                  mediaType: msg.reelData.mediaType,
                                  createdBy: msg.reelData.createdBy,
                                  createdByName: msg.senderId === user?._id ? user?.name : msg.user,
                                  createdAt: msg.reelData.createdAt,
                                  likes: msg.reelData.likes || [],
                                  comments: msg.reelData.comments || [],
                                } as Reel)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all btn-glow-purple",
                                  isDarkMode
                                    ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                )}
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                Repost to Story
                              </button>
                            </div>
                          </div>
                        )}

                                                {msg.isGhost && (
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/90 mb-2">
                            Vanishing message · visible for ~60s — text is readable below
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            {renderMessageText(msg, isMe)}
                            
                            {/* Outgoing Translation Indicator - shows for sender when message was translated */}
                            {isMe && msg.originalText && (
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                  "mt-1 px-2 py-1 rounded-lg text-xs flex items-center gap-1.5",
                                  isDarkMode ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                )}
                              >
                                <Languages className="w-3 h-3" />
                                <span className="font-medium">
                                  Translated to {SUPPORTED_LANGUAGES.find(l => l.code === outgoingTargetLang)?.name || outgoingTargetLang} for receiver
                                </span>
                              </motion.div>
                            )}
                            
                            {/* Translation - shows inline below message */}
                            {msg.translatedText && msg.text && msg.translatedText !== msg.text && (
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                  "mt-2 p-3 rounded-xl border text-sm relative",
                                  isDarkMode ? "bg-blue-500/10 border-blue-500/30 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
                                )}
                              >
                                <button
                                  onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, translatedText: undefined } : m))}
                                  className="absolute top-2 right-2 p-1 hover:bg-blue-500/20 rounded-full transition-colors"
                                  title="Hide translation"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="flex items-center gap-2 mb-1 pr-5">
                                  <Languages className="w-3 h-3" />
                                  <span className="text-[8px] font-black uppercase tracking-widest">
                                    🌐 Translated ({msg.translateTargetLang === 'hi' ? 'Hindi' : 'English'})
                                  </span>
                                </div>
                                <p className="font-medium">{msg.translatedText}</p>
                              </motion.div>
                            )}
                            {/* Original text - only show when this client translated a message (msg.text is original) */}
                            {msg.originalText && msg.translatedText && msg.text && msg.translatedText !== msg.text && (
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                  "mt-2 p-3 rounded-xl border text-sm",
                                  msg.senderId === user?._id 
                                    ? (isDarkMode ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-700")
                                    : (isDarkMode ? "bg-blue-500/10 border-blue-500/30 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700")
                                )}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Languages className="w-3 h-3" />
                                  <span className="text-[8px] font-black uppercase tracking-widest">
                                    🌐 Original
                                  </span>
                                </div>
                                <p className="font-medium">{msg.originalText}</p>
                              </motion.div>
                            )}
                            {/* AI Explanation - shows inline below translation */}
                            {msg.explainedText && (
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                  "mt-2 p-3 rounded-xl border text-sm relative",
                                  isDarkMode ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                )}
                              >
                                <button
                                  onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, explainedText: undefined } : m))}
                                  className="absolute top-2 right-2 p-1 hover:bg-emerald-500/20 rounded-full transition-colors"
                                  title="Dismiss explanation"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="flex items-center gap-2 mb-1 pr-5">
                                  <Bot className="w-3 h-3" />
                                  <span className="text-[8px] font-black uppercase tracking-widest">
                                    AI Explanation
                                  </span>
                                </div>
                                <p className="font-medium">{msg.explainedText}</p>
                              </motion.div>
                            )}
                          </div>
                        </div>
                        {msg.isEdited && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1 block">
                            Edited {new Date(msg.editedAt!).toLocaleTimeString()}
                          </span>
                        )}
                        
                        {/* Reactions Display - Only for text messages, not for images */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && !msg.image && !msg.video && !msg.audio && (
                          <div className="flex flex-wrap gap-1 mt-4">
                            {Object.entries(msg.reactions).map(([emoji, users]) => (
                              <motion.button
                                key={emoji}
                                whileHover={{ scale: 1.1 }}
                                onClick={() => addReaction(msg.id!, emoji)}
                                className={cn(
                                  "px-2 py-1 rounded-full text-xs flex items-center gap-1 border transition-colors",
                                  (users as string[]).includes(user.name) 
                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-500" 
                                    : isDarkMode ? "bg-slate-900 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                                )}
                              >
                                <span>{emoji}</span>
                                <span className="font-black">{(users as string[]).length}</span>
                              </motion.button>
                            ))}
                          </div>
                        )}

                        {/* AI Explain & Translate Buttons - Icon only + Three Dot Menu */}
                        {msg.text && !msg.isSystem && !msg.isAI && (
                          <div className="flex items-center gap-2 mt-2">
                            {/* AI Explain */}
                            <button
                              onClick={() => {
                                console.log("[AI Explain] Icon clicked for message:", msg.id);
                                explainMessageWithAI(msg.id!, msg.text);
                              }}
                              disabled={explainingId === msg.id}
                              title="AI Explain"
                              className={cn(
                                "p-2 rounded-full transition-all",
                                explainingId === msg.id
                                  ? "animate-pulse cursor-not-allowed bg-amber-500 text-white"
                                  : isDarkMode
                                    ? "text-amber-400 hover:bg-amber-500/20 hover:scale-110"
                                    : "text-amber-500 hover:bg-amber-500/10 hover:scale-110"
                              )}
                            >
                              <Sparkles className={cn("w-4 h-4", explainingId === msg.id && "animate-spin")} />
                            </button>
                            {/* Translate */}
                            <button
                              onClick={() => {
                                console.log("[Translate] Icon clicked for message:", msg.id);
                                translateMessage(msg.id!, msg.text);
                              }}
                              disabled={translatingId === msg.id}
                              title="Translate (auto-detect EN ⇄ HI)"
                              className={cn(
                                "p-2 rounded-full transition-all",
                                translatingId === msg.id
                                  ? "animate-pulse cursor-not-allowed bg-blue-500 text-white"
                                  : isDarkMode
                                    ? "text-blue-400 hover:bg-blue-500/20 hover:scale-110"
                                    : "text-blue-500 hover:bg-blue-500/10 hover:scale-110"
                              )}
                            >
                              <Languages className={cn("w-4 h-4", translatingId === msg.id && "animate-spin")} />
                            </button>
                            {/* Three Dot Menu - Moved here next to AI buttons */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setMessageMenu({
                                  show: true,
                                  messageId: msg.id!,
                                  x: rect.left,
                                  y: rect.bottom + 5
                                });
                              }}
                              className={cn(
                                "p-2 rounded-full transition-all hover:scale-110",
                                isDarkMode
                                  ? "text-slate-400 hover:text-white hover:bg-slate-700"
                                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                              )}
                              title="More Options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Reaction Picker Trigger */}
                        <div className={cn(
                          "absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 p-1.5 rounded-full shadow-2xl z-30",
                          isMe ? "right-0" : "left-0",
                          isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-100"
                        )}>
                          {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => addReaction(msg.id!, emoji)}
                              className="p-1.5 hover:bg-emerald-500/10 rounded-full transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                          {/* AI Explain Button - Direct on message */}
                          {msg.text && !msg.isSystem && (
                            <button
                              onClick={() => {
                                console.log("[AI Explain] Button clicked for message:", msg.id, "text:", msg.text?.substring(0, 30));
                                explainMessageWithAI(msg.id!, msg.text);
                              }}
                              disabled={explainingId === msg.id}
                              title="AI Explain"
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-full transition-all text-xs font-bold z-50",
                                explainingId === msg.id
                                  ? "animate-pulse cursor-not-allowed bg-amber-500 text-white"
                                  : "hover:bg-amber-500 hover:text-white bg-white/90 dark:bg-slate-800/90 text-amber-500 dark:text-amber-400 shadow-lg"
                              )}
                            >
                              <Sparkles className={cn("w-3 h-3", explainingId === msg.id && "animate-spin")} />
                              {explainingId === msg.id ? '...' : 'AI'}
                            </button>
                          )}
                        </div>

                                              </div>
                    </div>
                  </div>
                );
              })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })()}
              
              {/* Conversation Summary Display */}
              {conversationSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "mx-4 mb-4 p-4 rounded-2xl border shadow-lg",
                    isDarkMode ? "bg-orange-500/10 border-orange-500/30" : "bg-orange-50 border-orange-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2">Conversation Summary</h4>
                      <p className={cn("text-sm leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                        {conversationSummary}
                      </p>
                    </div>
                    <button 
                      onClick={() => setConversationSummary('')}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
              
              {activeFeed === 'reels' && (
                <div className="w-full px-2 md:px-0 py-4 space-y-6">
                  {/* AI Suggestions Header */}
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      🔥 Trending Now
                    </h3>
                    <button
                      onClick={openAISuggestions}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all btn-glow-purple",
                        isDarkMode
                          ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                          : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      )}
                    >
                      <Sparkles className="w-4 h-4" />
                      AI Suggestions
                    </button>
                  </div>
                  {/* Trending Reels Row */}
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {trendingReels.slice(0, 5).map((reel, idx) => (
                        <motion.div
                          key={reel._id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => {
                            // Play trending reel
                          }}
                          className="relative flex-shrink-0 w-32 h-48 rounded-2xl overflow-hidden cursor-pointer border-2 border-orange-500/30"
                        >
                          <div className="absolute top-2 left-2 bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-full">
                            🔥
                          </div>
                          {reel.mediaType === 'video' ? (
                            <video
                              src={reel.mediaUrl}
                              className="w-full h-full object-cover"
                              muted
                              loop
                              onMouseEnter={(e) => e.currentTarget.play()}
                              onMouseLeave={(e) => e.currentTarget.pause()}
                            />
                          ) : (
                            <img 
                              src={reel.mediaUrl}
                              alt={reel.caption}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                              <span className="text-white text-[10px] font-bold">{(reel.likes || []).length}</span>
                              <span className="text-white text-[10px]">❤️</span>
                            </div>
                            <button 
                              onClick={() => {
                                // Toggle like functionality
                                const updatedReels = reels.map(r => 
                                  r._id === reel._id 
                                    ? { ...r, liked: !r.liked, likes: r.liked ? (r.likes || []).filter(u => u !== user.name) : [...(r.likes || []), user.name] }
                                    : r
                                );
                                setReels(updatedReels);
                                
                                // Send like to server
                                propSocket?.emit('reel_like', {
                                  reelId: reel._id,
                                  user: user.name,
                                  action: reel.liked ? 'unlike' : 'like'
                                });
                              }}
                              className="absolute top-1 right-1 w-6 h-6 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                            >
                              <Heart className={cn("w-3 h-3", reel.liked ? "fill-current text-red-500" : "")} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                  </div>

                  {/* Reels Composer */}
                  <div className={cn(
                    "p-5 rounded-[2rem] border shadow-2xl backdrop-blur-xl",
                    isDarkMode ? "bg-slate-900/60 border-slate-800/60" : "bg-white/60 border-slate-100/60"
                  )}>
                    <div className="flex flex-col md:flex-row gap-3 md:items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          Caption
                        </label>
                        <input
                          value={newReelCaption}
                          onChange={(e) => setNewReelCaption(e.target.value)}
                          placeholder="Write a caption..."
                          className={cn(
                            "w-full px-4 py-3 rounded-2xl outline-none border text-sm font-bold transition-all",
                            isDarkMode ? "bg-slate-950/30 border-slate-800 text-white focus:border-emerald-500/50" : "bg-white border-slate-100 text-slate-900 focus:border-emerald-500/50"
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          Upload from Device
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Validate file size (max 50MB)
                                if (file.size > 50 * 1024 * 1024) {
                                  addNotification('File size too large. Maximum 50MB allowed.', 'error');
                                  return;
                                }
                                
                                // Validate file type
                                const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
                                if (!validTypes.includes(file.type)) {
                                  addNotification('Invalid file type. Please upload an image or video.', 'error');
                                  return;
                                }

                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  const result = e.target?.result as string;
                                  setNewReelMediaUrl(result);
                                  setNewReelMediaType(file.type.startsWith('image/') ? 'image' : 'video');
                                  addNotification(`${file.type.startsWith('image/') ? 'Image' : 'Video'} uploaded successfully!`, 'success');
                                };
                                reader.onerror = () => {
                                  addNotification('Failed to read file. Please try again.', 'error');
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                            id="file-upload"
                          />
                          <label
                            htmlFor="file-upload"
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all text-sm font-bold",
                              isDarkMode ? "bg-slate-950/30 border-slate-800 text-white hover:border-emerald-500/50" : "bg-white border-slate-100 text-slate-900 hover:border-emerald-500/50"
                            )}
                          >
                            <Upload className="w-4 h-4" />
                            <span>{newReelMediaUrl ? 'File Selected' : 'Choose File'}</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          Media URL (Optional)
                        </label>
                        <input
                          value={newReelMediaUrl}
                          onChange={(e) => setNewReelMediaUrl(e.target.value)}
                          placeholder="https://... (image or video url)"
                          className={cn(
                            "w-full px-4 py-3 rounded-2xl outline-none border text-sm font-bold transition-all",
                            isDarkMode ? "bg-slate-950/30 border-slate-800 text-white focus:border-emerald-500/50" : "bg-white border-slate-100 text-slate-900 focus:border-emerald-500/50"
                          )}
                        />
                      </div>
                      <div className="w-full md:w-40">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          Type
                        </label>
                        <select
                          value={newReelMediaType}
                          onChange={(e) => setNewReelMediaType(e.target.value as 'image' | 'video')}
                          className={cn(
                            "w-full px-4 py-3 rounded-2xl outline-none border text-sm font-bold transition-all",
                            isDarkMode ? "bg-slate-950/30 border-slate-800 text-white focus:border-emerald-500/50" : "bg-white border-slate-100 text-slate-900 focus:border-emerald-500/50"
                          )}
                        >
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                        </select>
                      </div>
                      <button
                        onClick={handleCreateReel}
                        className={cn(
                          "px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest shadow-xl transition-transform hover:scale-[1.02]",
                          isDarkMode ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-slate-900 text-white shadow-slate-900/20"
                        )}
                        disabled={!newReelMediaUrl.trim()}
                      >
                        Upload Post
                      </button>
                    </div>
                    <p className={cn("mt-3 text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Tip: Paste an image/video URL then Share it to your current chat.
                    </p>
                  </div>

                  {/* Reels Feed */}
                  <div className="space-y-5">
                    {reels.length === 0 ? (
                      <div className={cn(
                        "p-8 rounded-[2rem] border text-center",
                        isDarkMode ? "bg-slate-900/40 border-slate-800/50" : "bg-white/60 border-slate-100/60"
                      )}>
                        <p className="text-slate-400 font-bold">No reels yet. Post the first one.</p>
                      </div>
                    ) : (
                      reels.map((reel, idx) => (
                        <motion.div
                          key={reel._id}
                          data-reel-id={reel._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.03 }}
                          className={cn(
                            "rounded-[2.5rem] overflow-hidden border shadow-2xl",
                            isDarkMode ? "bg-slate-900/40 border-slate-800/50" : "bg-white/70 border-slate-100/70"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4 p-5">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openUserProfile(reel)}
                                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                              >
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                                  isDarkMode ? "bg-gradient-to-br from-emerald-500 to-cyan-400" : "bg-emerald-500"
                                )}>
                                  <Camera className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-black hover:underline">{reel.createdByName}</p>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                    {reel.mediaType.toUpperCase()} • {reel.createdAt ? new Date(reel.createdAt).toLocaleDateString() : ''}
                                  </p>
                                </div>
                              </button>
                            </div>
                          </div>

                          {reel.mediaType === 'video' ? (
                            <div 
                              className="relative group cursor-pointer"
                              onClick={() => setViewingReel(reel)}
                            >
                              <video
                                src={reel.mediaUrl}
                                controls={false}
                                controlsList="nodownload"
                                preload="metadata"
                                playsInline
                                autoPlay
                                loop
                                muted
                                className="w-full max-h-[520px] bg-black object-contain"
                                onError={() => console.error("Reel video failed to load:", reel.mediaUrl)}
                                crossOrigin="anonymous"
                                onMouseEnter={(e) => e.currentTarget.play()}
                                onMouseLeave={(e) => e.currentTarget.pause()}
                              />
                              {/* Play icon overlay */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Play className="w-8 h-8 text-white fill-white" />
                                </div>
                              </div>
                              
                              {/* Double-tap like animation */}
                              <motion.div
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                initial={{ opacity: 0 }}
                                whileTap={{ scale: [1, 0.8, 1.2, 1] }}
                                onTap={() => {
                                  // Like animation
                                  const likes = reel.likes || [];
                                  const userId = user._id;
                                  setReels(prev => prev.map(r => 
                                    r._id === reel._id 
                                      ? { ...r, likes: likes.includes(userId) ? likes : [...likes, userId] }
                                      : r
                                  ));
                                }}
                              >
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 2, opacity: 0 }}
                                  className="text-white text-6xl"
                                >
                                  ❤️
                                </motion.div>
                              </motion.div>
                              
                              {/* Custom controls overlay */}
                              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
                                  <span className="text-white text-sm font-bold">{reel.createdByName}</span>
                                  <span className="text-white text-xs opacity-75">{new Date(reel.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const likes = reel.likes || [];
                                      const userId = user._id;
                                      setReels(prev => prev.map(r => 
                                        r._id === reel._id 
                                          ? { ...r, likes: likes.includes(userId) ? likes : [...likes, userId] }
                                          : r
                                      ));
                                    }}
                                    className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
                                  >
                                    <span className="text-white text-sm">❤️ {(reel.likes || []).length}</span>
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      shareReelToChat(reel);
                                    }}
                                    className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
                                  >
                                    <Share2 className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="relative group cursor-pointer"
                              onClick={() => setViewingReel(reel)}
                            >
                              <img
                                src={reel.mediaUrl}
                                alt="Reel"
                                className="w-full max-h-[520px] object-cover"
                                referrerPolicy="no-referrer"
                              />
                              {/* View icon overlay */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="w-8 h-8 text-white fill-white" />
                                </div>
                              </div>
                              
                              {/* Double-tap like animation for images */}
                              <motion.div
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                initial={{ opacity: 0 }}
                                whileTap={{ scale: [1, 0.8, 1.2, 1] }}
                                onTap={() => {
                                  const likes = reel.likes || [];
                                  const userId = user._id;
                                  setReels(prev => prev.map(r => 
                                    r._id === reel._id 
                                      ? { ...r, likes: likes.includes(userId) ? likes : [...likes, userId] }
                                      : r
                                  ));
                                }}
                              >
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 2, opacity: 0 }}
                                  className="text-white text-6xl"
                                >
                                  ❤️
                                </motion.div>
                              </motion.div>
                              
                              {/* Image overlay */}
                              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
                                  <span className="text-white text-sm font-bold">{reel.createdByName}</span>
                                  <span className="text-white text-xs opacity-75">{new Date(reel.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const likes = reel.likes || [];
                                      const userId = user._id;
                                      setReels(prev => prev.map(r => 
                                        r._id === reel._id 
                                          ? { ...r, likes: likes.includes(userId) ? likes : [...likes, userId] }
                                          : r
                                      ));
                                    }}
                                    className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
                                  >
                                    <span className="text-white text-sm">❤️ {(reel.likes || []).length}</span>
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      shareReelToChat(reel);
                                    }}
                                    className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
                                  >
                                    <Share2 className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="p-5 space-y-3">
                            {reel.caption?.trim() && (
                              <p className={cn(
                                "text-sm font-bold leading-relaxed",
                                isDarkMode ? "text-slate-100" : "text-slate-900"
                              )}>
                                {reel.caption}
                              </p>
                            )}
                            <div className="flex gap-3">
                              <button
                                onClick={() => toggleReelLike(reel)}
                                className={cn(
                                  "flex items-center gap-2 px-5 py-3 rounded-[2rem] font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-[1.02] text-[10px]",
                                  (reel.likes || []).includes(user._id)
                                    ? "bg-emerald-500 text-white shadow-emerald-500/30"
                                    : isDarkMode
                                      ? "bg-slate-900 text-white shadow-slate-900/20"
                                      : "bg-white text-slate-900 border border-slate-200"
                                )}
                                title="Like"
                              >
                                <Heart className="w-4 h-4" />
                                {(reel.likes || []).length}
                              </button>
                              <button
                                onClick={() => setActiveCommentReel(activeCommentReel === reel._id ? null : reel._id)}
                                className={cn(
                                  "flex items-center gap-2 px-5 py-3 rounded-[2rem] font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-[1.02] text-[10px]",
                                  isDarkMode ? "bg-slate-900 text-white shadow-slate-900/20" : "bg-white text-slate-900 border border-slate-200"
                                )}
                                title="Comment"
                              >
                                <MessageSquare className="w-4 h-4" />
                                {(reel.comments || []).length}
                              </button>
                              <button
                                onClick={() => shareReelToChat(reel)}
                                className={cn(
                                  "flex-1 px-5 py-3 rounded-[2rem] font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-[1.02]",
                                  isDarkMode ? "bg-slate-900 text-white shadow-slate-900/20" : "bg-white text-slate-900 border border-slate-200"
                                )}
                              >
                                Share to Chat
                              </button>
                            </div>

                            {activeCommentReel === reel._id && (
                              <div className="mt-4 space-y-3">
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                  {(reel.comments || []).map(comment => (
                                    <div key={comment._id} className={cn("p-2 rounded-xl text-sm", isDarkMode ? "bg-slate-800/50" : "bg-slate-100")}>
                                      <span className="font-bold mr-2">{comment.userName}:</span>
                                      <span>{comment.text}</span>
                                    </div>
                                  ))}
                                  {!(reel.comments || []).length && (
                                    <p className="text-xs text-center opacity-50">No comments yet.</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Add a comment..."
                                    className={cn(
                                      "flex-1 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500",
                                      isDarkMode ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"
                                    )}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleAddComment(reel._id);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleAddComment(reel._id)}
                                    disabled={!commentText.trim()}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl disabled:opacity-50"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-3">
                              <button
                                onClick={() => {
                                  setActiveFeed('chat');
                                }}
                                className={cn(
                                  "w-14 flex items-center justify-center px-3 py-3 rounded-[2rem] shadow-lg transition-transform hover:scale-[1.02]",
                                  isDarkMode ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-emerald-500 text-white"
                                )}
                                title="Back to chat"
                              >
                                <MessageSquare className="w-5 h-5" />
                              </button>

                              {(reel.createdBy as any) === user._id && (
                                <>
                                  <button
                                    onClick={() => startEditReel(reel)}
                                    className={cn(
                                      "w-14 flex items-center justify-center px-3 py-3 rounded-[2rem] shadow-lg transition-transform hover:scale-[1.02]",
                                      isDarkMode ? "bg-slate-900 text-slate-200 shadow-slate-900/20" : "bg-white text-slate-900 border border-slate-200"
                                    )}
                                    title="Edit"
                                  >
                                    <Settings className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => deleteReel(reel)}
                                    className={cn(
                                      "w-14 flex items-center justify-center px-3 py-3 rounded-[2rem] shadow-lg transition-transform hover:scale-[1.02]",
                                      "bg-red-500 text-white shadow-red-500/20 hover:bg-red-600"
                                    )}
                                    title="Delete"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                            </div>
                            <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              Shares to current {selectedGroup ? 'group' : (selectedUser ? 'friend' : 'global')} chat.
                            </p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
            )}
            {/* Reel Viewing Modal */}
            <AnimatePresence>
              {viewingReel && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md"
                  onClick={() => setViewingReel(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full h-full max-w-4xl max-h-screen flex flex-col items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Close button */}
                    <button
                      onClick={() => setViewingReel(null)}
                      className="absolute top-4 right-4 z-10 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>

                    {/* Reel info header */}
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-2xl px-4 py-2">
                      <Camera className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-white font-bold text-sm">{viewingReel.createdByName}</p>
                        <p className="text-white/60 text-xs">{viewingReel.mediaType.toUpperCase()}</p>
                      </div>
                    </div>

                    {/* Media display */}
                    <div className="relative w-full h-full flex items-center justify-center">
                      {viewingReel.mediaType === 'video' ? (
                        <video
                          src={viewingReel.mediaUrl}
                          controls
                          autoPlay
                          className="max-w-full max-h-[80vh] object-contain rounded-xl"
                          onError={() => showBrowserNotification('Error', 'Failed to load video', 'error')}
                        />
                      ) : (
                        <img
                          src={viewingReel.mediaUrl}
                          alt={viewingReel.caption || 'Reel'}
                          className="max-w-full max-h-[80vh] object-contain rounded-xl"
                          onError={() => showBrowserNotification('Error', 'Failed to load image', 'error')}
                        />
                      )}
                    </div>

                    {/* Caption and actions */}
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-3">
                      {viewingReel.caption && (
                        <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-4 py-3">
                          <p className="text-white text-sm">{viewingReel.caption}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => {
                            toggleReelLike(viewingReel);
                            setViewingReel({...viewingReel, liked: !viewingReel.liked});
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-full font-bold hover:bg-emerald-600 transition-colors"
                        >
                          <Heart className={`w-5 h-5 ${(viewingReel.likes || []).includes(user._id) ? 'fill-current' : ''}`} />
                          {(viewingReel.likes || []).length} Likes
                        </button>
                        <button
                          onClick={() => {
                            shareReelToChat(viewingReel);
                            setViewingReel(null);
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-full font-bold hover:bg-white/30 transition-colors"
                        >
                          <Share2 className="w-5 h-5" />
                          Share
                        </button>
                        <a
                          href={viewingReel.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-full font-bold hover:bg-white/30 transition-colors"
                        >
                          <ExternalLink className="w-5 h-5" />
                          Open Link
                        </a>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
                {editReelId && (
                  <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className={cn(
                        "w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative",
                        isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                      )}
                    >
                      <button
                        onClick={() => setEditReelId(null)}
                        className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        title="Close"
                      >
                        <X className="w-6 h-6" />
                      </button>

                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black uppercase tracking-tight">Edit Reel</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/90">
                            Update caption/media
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Caption
                          </label>
                          <input
                            value={editReelCaption}
                            onChange={(e) => setEditReelCaption(e.target.value)}
                            className={cn(
                              "w-full px-4 py-3 rounded-2xl outline-none border text-sm font-bold transition-all",
                              isDarkMode ? "bg-slate-950/30 border-slate-800 text-white focus:border-emerald-500/50" : "bg-white border-slate-100 text-slate-900 focus:border-emerald-500/50"
                            )}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Media URL
                          </label>
                          <input
                            value={editReelMediaUrl}
                            onChange={(e) => setEditReelMediaUrl(e.target.value)}
                            className={cn(
                              "w-full px-4 py-3 rounded-2xl outline-none border text-sm font-bold transition-all",
                              isDarkMode ? "bg-slate-950/30 border-slate-800 text-white focus:border-emerald-500/50" : "bg-white border-slate-100 text-slate-900 focus:border-emerald-500/50"
                            )}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Type
                          </label>
                          <select
                            value={editReelMediaType}
                            onChange={(e) => setEditReelMediaType(e.target.value as 'image' | 'video')}
                            className={cn(
                              "w-full px-4 py-3 rounded-2xl outline-none border text-sm font-bold transition-all",
                              isDarkMode ? "bg-slate-950/30 border-slate-800 text-white focus:border-emerald-500/50" : "bg-white border-slate-100 text-slate-900 focus:border-emerald-500/50"
                            )}
                          >
                            <option value="image">Image</option>
                            <option value="video">Video</option>
                          </select>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={saveEditReel}
                            className={cn(
                              "flex-1 px-6 py-4 rounded-[2rem] font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-[1.02]",
                              isDarkMode ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-slate-900 text-white shadow-slate-900/20"
                            )}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditReelId(null)}
                            className={cn(
                              "px-6 py-4 rounded-[2rem] font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-[1.02]",
                              isDarkMode ? "bg-slate-800 text-white" : "bg-white text-slate-900 border border-slate-200"
                            )}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
              
              {activeFeed === 'chat' && isAiThinking && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col items-start"
                >
                  <div className="bg-slate-900 text-white px-6 py-4 rounded-3xl rounded-tl-none flex items-center gap-3 shadow-xl">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-[9px] font-black tracking-widest uppercase text-emerald-500">Thinking</span>
                  </div>
                </motion.div>
              )}

              {activeFeed === 'chat' && Array.from(typingUsers).filter(u => u !== user.name).map(u => (
                <motion.div key={u} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-6">
                  {u} is typing...
                </motion.div>
              ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Info Modal */}
          <AnimatePresence>
            {messageInfo && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className={cn(
                    "w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative",
                    isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                  )}
                >
                  <button 
                    onClick={() => setMessageInfo(null)}
                    className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
                      <Info className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Message Info</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Quantum Node Data</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold leading-relaxed mb-4">{messageInfo.text}</p>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <Activity className="w-3 h-3" />
                        <span>Sentiment: {messageInfo.sentiment}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Sent At</p>
                        <p className="text-xs font-bold">{new Date(messageInfo.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</p>
                        <div className="flex items-center gap-1">
                          <CheckCheck className="w-3 h-3 text-emerald-500" />
                          <p className="text-xs font-bold">Delivered</p>
                        </div>
                      </div>
                    </div>
                    
                    {messageInfo.isEdited && (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mb-1">Last Edited</p>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{new Date(messageInfo.editedAt!).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Message Options Menu */}
          <AnimatePresence>
            {messageMenu.show && messageMenu.messageId && (() => {
              const msg = messages.find(m => m.id === messageMenu.messageId);
              if (!msg) return null;
              const isMyMessage = msg.senderId === user?._id;

              return (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMessageMenu({ show: false, messageId: null, x: 0, y: 0 })}
                    className="fixed inset-0 z-[90]"
                  />

                  {/* Menu */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    style={{
                      position: 'fixed',
                      left: Math.min(messageMenu.x, window.innerWidth - 220),
                      top: messageMenu.y,
                      zIndex: 100
                    }}
                    className={cn(
                      "min-w-[200px] rounded-xl border shadow-2xl overflow-hidden",
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 shadow-slate-900/50"
                        : "bg-white border-slate-200 shadow-slate-100/50"
                    )}
                  >
                    {/* Forward - Available for all messages */}
                    <button
                      onClick={() => {
                        handleForwardMessage(msg);
                        setMessageMenu({ show: false, messageId: null, x: 0, y: 0 });
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                        isDarkMode
                          ? "hover:bg-slate-700 text-slate-200"
                          : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <Forward className="w-4 h-4 text-emerald-500" />
                      Forward
                    </button>

                    {/* Copy Text - Available for text messages */}
                    {msg.text && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.text);
                          showBrowserNotification('Copied', 'Message text copied to clipboard', 'success');
                          setMessageMenu({ show: false, messageId: null, x: 0, y: 0 });
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                          isDarkMode
                            ? "hover:bg-slate-700 text-slate-200"
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <Copy className="w-4 h-4 text-slate-500" />
                        Copy
                      </button>
                    )}

                    {/* Message Info */}
                    <button
                      onClick={() => {
                        setMessageInfo(msg);
                        setMessageMenu({ show: false, messageId: null, x: 0, y: 0 });
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                        isDarkMode
                          ? "hover:bg-slate-700 text-slate-200"
                          : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <Info className="w-4 h-4 text-purple-500" />
                      Message Info
                    </button>

                    {/* AI Tools - AI Explain & Translate */}
                    {msg.text && (
                      <button
                        onClick={() => {
                          setSelectedMessageForAi(msg);
                          setAiToolActiveTab('explain');
                          setAiToolResult('');
                          setShowAiToolsModal(true);
                          setMessageMenu({ show: false, messageId: null, x: 0, y: 0 });
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                          isDarkMode
                            ? "hover:bg-slate-700 text-slate-200"
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <Bot className="w-4 h-4 text-emerald-500" />
                        AI Tools
                      </button>
                    )}

                    {/* Divider */}
                    <div className={cn("h-px mx-2", isDarkMode ? "bg-slate-700" : "bg-slate-200")} />

                    {/* Edit - Only for my messages */}
                    {isMyMessage && (
                      <button
                        onClick={() => {
                          handleEditMessage(msg);
                          setMessageMenu({ show: false, messageId: null, x: 0, y: 0 });
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                          isDarkMode
                            ? "hover:bg-slate-700 text-slate-200"
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <Settings className="w-4 h-4 text-amber-500" />
                        Edit
                      </button>
                    )}

                    {/* Delete for Everyone - Only for my messages */}
                    {isMyMessage && (
                      <button
                        onClick={() => {
                          handleDeleteForEveryone(msg.id!);
                          setMessageMenu({ show: false, messageId: null, x: 0, y: 0 });
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                          isDarkMode
                            ? "hover:bg-red-500/20 text-red-400"
                            : "hover:bg-red-50 text-red-600"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete for Everyone
                      </button>
                    )}

                    {/* Delete for Me - Available for all messages */}
                    <button
                      onClick={() => {
                        handleDeleteForMe(msg.id!);
                        setMessageMenu({ show: false, messageId: null, x: 0, y: 0 });
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center gap-3",
                        isDarkMode
                          ? "hover:bg-orange-500/20 text-orange-400"
                          : "hover:bg-orange-50 text-orange-600"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete for Me
                    </button>
                  </motion.div>
                </>
              );
            })()}
          </AnimatePresence>

          <AnimatePresence>
            {summary && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className={cn(
                  "absolute bottom-32 left-6 right-6 md:left-12 md:right-12 p-8 rounded-[3rem] shadow-2xl border z-30 transition-colors duration-300",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                )}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Sparkles className="w-6 h-6 text-emerald-500" />
                    <h3 className={cn("text-xl font-black tracking-tighter uppercase", isDarkMode ? "text-white" : "text-slate-900")}>Recap.</h3>
                  </div>
                  <button onClick={() => setSummary(null)} className={cn("p-2 rounded-xl transition-colors", isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50")}>
                    <X className="w-6 h-6 text-slate-300" />
                  </button>
                </div>
                <div className={cn("p-6 rounded-[2rem] border transition-colors", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100")}>
                  <p className={cn("text-sm leading-relaxed font-bold italic", isDarkMode ? "text-slate-300" : "text-slate-700")}>"{summary}"</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Smart Replies */}
          <AnimatePresence>
            {activeFeed === 'chat' && smartReplies.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar"
              >
                {smartReplies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputMessage(reply);
                      setSmartReplies([]);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                      isDarkMode ? "bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800" : "bg-white border-slate-100 text-emerald-600 hover:bg-slate-50"
                    )}
                  >
                    {reply}
                  </button>
                ))}
                <button onClick={() => setSmartReplies([])} className="p-2 text-slate-300 hover:text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Suggestions */}
          <AnimatePresence>
            {aiSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mx-4 mb-2 flex gap-2 flex-wrap"
              >
                {aiSuggestions.map((suggestion, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      backgroundColor: selectedSuggestionIndex === i ? 
                        (isDarkMode ? 'rgb(168 85 247 / 0.3)' : 'rgb(168 85 247 / 0.2)') : 
                        'transparent'
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => {
                      setInputMessage(suggestion);
                      setAiSuggestions([]);
                      setSelectedSuggestionIndex(-1);
                      // Focus back to input after selecting suggestion
                      const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
                      if (inputElement) inputElement.focus();
                    }}
                    className={cn(
                      "relative px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all whitespace-nowrap group",
                      "shadow-sm hover:shadow-md backdrop-blur-sm",
                      selectedSuggestionIndex === i && 
                        (isDarkMode ? "bg-purple-500/30 border-purple-500/60 shadow-purple-500/30" : "bg-purple-200/50 border-purple-400/60 shadow-purple-500/20"),
                      isDarkMode 
                        ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 text-purple-300 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 hover:border-purple-500/50 hover:shadow-purple-500/20" 
                        : "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-700 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 hover:border-purple-300 hover:shadow-purple-500/10"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {selectedSuggestionIndex === i && (
                        <ChevronRight className="w-3 h-3 text-purple-400" />
                      )}
                      <Sparkles className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                      {suggestion}
                    </span>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
                <motion.button 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setAiSuggestions([])}
                  className={cn(
                    "p-2 rounded-full transition-all hover:bg-slate-500/10",
                    "text-slate-400 hover:text-slate-600",
                    isDarkMode && "hover:bg-slate-800/50"
                  )}
                  title="Dismiss suggestions"
                >
                  <X className="w-3 h-3" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Media Preview */}
          <AnimatePresence>
            {showMediaPreview && mediaPreview && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={cn(
                  "px-4 py-3 border-t flex items-center gap-4",
                  isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-slate-50/80 border-slate-200"
                )}
              >
                <div className="relative">
                  {mediaPreview.type === 'image' ? (
                    <img src={mediaPreview.url} alt="Preview" className="w-16 h-16 rounded-xl object-cover" />
                  ) : mediaPreview.type === 'video' ? (
                    <video src={mediaPreview.url} className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-500" />
                    </div>
                  )}
                  <button
                    onClick={clearMediaPreview}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-slate-900")}>
                    {mediaPreview.file?.name || 'Selected file'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(mediaPreview.file?.size ? (mediaPreview.file.size / 1024 / 1024).toFixed(2) : '0')} MB
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (mediaPreview.file) {
                      handleFileUpload({ target: { files: [mediaPreview.file] } } as any);
                      clearMediaPreview();
                    }
                  }}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-all"
                >
                  Send
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Voice Recording UI */}
          <AnimatePresence>
            {isVoiceRecording && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={cn(
                  "px-4 py-3 border-t flex items-center justify-between",
                  isDarkMode ? "bg-red-950/30 border-red-900/50" : "bg-red-50/80 border-red-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500 animate-pulse flex items-center justify-center">
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  <span className={cn("font-medium", isDarkMode ? "text-red-400" : "text-red-600")}>
                    Recording... {Math.floor(voiceRecordingTime / 60)}:{String(voiceRecordingTime % 60).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={cancelVoiceRecording}
                    className="p-2 rounded-xl hover:bg-slate-500/10 transition-all"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                  <button
                    onClick={stopVoiceRecording}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-all"
                  >
                    Stop
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Voice Preview */}
          <AnimatePresence>
            {showVoiceMessagePreview && voiceMessageBlob && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={cn(
                  "px-4 py-3 border-t flex items-center gap-4",
                  isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-slate-50/80 border-slate-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-end gap-0.5 h-8">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-emerald-500 rounded-full voice-wave"
                        style={{ height: `${Math.random() * 20 + 4}px` }}
                      />
                    ))}
                  </div>
                </div>
                <span className={cn("text-sm", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                  Voice message ready
                </span>
                <div className="flex-1"></div>
                <button
                  onClick={() => {
                    setVoiceMessageBlob(null);
                    setShowVoiceMessagePreview(false);
                  }}
                  className="p-2 rounded-xl hover:bg-slate-500/10 transition-all"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  onClick={() => {
                    if (voiceMessageBlob && propSocket) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64Audio = reader.result as string;
                        const messageId = Math.random().toString(36).substr(2, 9);
                        
                        const messageData = {
                          id: messageId,
                          sender: { _id: user._id, name: user.name, pic: profilePic },
                          to: selectedUser?.name,
                          groupId: selectedGroup?._id,
                          content: "🎤 Voice Message",
                          audio: base64Audio,
                          isBlind: activeTab === 'blind',
                          chat: { users: selectedGroup ? selectedGroup.members.map(m => ({ _id: m._id })) : (selectedUser ? [{ _id: selectedUser._id }, { _id: user._id }] : [{ _id: 'all' }]) }
                        };
                        
                        propSocket.emit('new message', messageData);
                        
                        // Add to local messages
                        const localMessage: Message = {
                          _id: messageId,
                          sender: { _id: user._id, name: user.name, pic: profilePic },
                          to: selectedUser?.name,
                          groupId: selectedGroup?._id,
                          text: "🎤 Voice Message",
                          audio: base64Audio,
                          timestamp: new Date().toISOString(),
                          profilePic: profilePic || undefined,
                          isGhost: isGhostMode,
                          pending: true,
                          id: '',
                          user: ''
                        };
                        
                        setMessages(prev => [...prev, localMessage]);
                        scrollToBottom();
                      };
                      reader.readAsDataURL(voiceMessageBlob);
                    }
                    setVoiceMessageBlob(null);
                    setShowVoiceMessagePreview(false);
                  }}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-all"
                >
                  Send
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Area */}
          {(selectedUser || selectedGroup || activeTab === 'ai' || activeTab === 'blind') && (
            <div className={cn(
            "p-2 md:p-4 border-t relative transition-all duration-500 backdrop-blur-3xl",
            activeFeed === 'reels' && "hidden",
            isDarkMode ? "bg-slate-950/80 border-slate-800/50" : "bg-white/80 border-slate-100"
          )}>
            {editingMessage && (
              <div className={cn(
                "absolute bottom-full left-0 right-0 p-4 flex items-center justify-between border-b animate-in slide-in-from-bottom-4 z-40",
                isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-slate-50/90 border-slate-200"
              )}>
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Editing Message</span>
                </div>
                <button 
                  onClick={() => {
                    setEditingMessage(null);
                    setInputMessage('');
                  }}
                  className="p-2 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 right-0 md:left-10 md:right-auto z-50 mb-6 shadow-2xl rounded-3xl overflow-hidden border border-slate-200/50 animate-in slide-in-from-bottom-4">
                <EmojiPicker 
                  onEmojiClick={(emojiData: EmojiClickData) => {
                    setInputMessage(prev => prev + emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                  theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                  width={350}
                  height={400}
                />
              </div>
            )}

            {showStickers && (
              <div className={cn(
                "absolute bottom-full left-10 z-50 mb-6 p-8 rounded-[3rem] shadow-2xl border grid grid-cols-2 gap-6 w-[350px] transition-all backdrop-blur-2xl animate-in slide-in-from-bottom-4",
                isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-100"
              )}>
                <div className="col-span-2 flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-emerald-500" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Quantum Stickers</span>
                  </div>
                  <button onClick={() => setShowStickers(false)} className="p-2 hover:bg-slate-500/10 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-300" /></button>
                </div>
                {STICKERS.map((sticker, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05, rotate: i % 2 === 0 ? 2 : -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const messageId = Math.random().toString(36).substr(2, 9);
                      const chatUsers = selectedGroup 
                        ? selectedGroup.members.map(m => m._id)
                        : selectedUser 
                          ? [user._id, selectedUser._id] 
                          : [{ _id: 'all' }];

                      const propSocketData = {
                        id: messageId,
                        sender: { _id: user._id, name: user.name, pic: profilePic },
                        to: selectedUser?.name,
                        groupId: selectedGroup?._id,
                        content: "Sticker",
                        image: sticker,
                        isBlind: activeTab === 'blind',
                        chat: { users: chatUsers }
                      };

                      propSocket?.emit('new message', propSocketData);
                      setShowStickers(false);
                    }}
                    className={cn(
                      "rounded-2xl overflow-hidden border-2 hover:border-emerald-500 transition-all shadow-lg",
                      isDarkMode ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50"
                    )}
                  >
                    <img src={sticker} alt="Sticker" className="w-full h-auto p-2" referrerPolicy="no-referrer" />
                  </motion.button>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full">
              <div className="flex items-center justify-between md:justify-start gap-2 order-2 md:order-1">
                <div className="flex gap-2 bg-slate-500/5 p-1.5 rounded-[2rem]">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all",
                      isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm"
                    )}
                  >
                    <Paperclip className="w-4 h-4" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button" 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all",
                      showEmojiPicker ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" : (isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm")
                    )}
                  >
                    <Smile className="w-4 h-4" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button" 
                    onClick={() => setShowStickers(!showStickers)}
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all",
                      showStickers ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" : (isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm")
                    )}
                  >
                    <ImageIcon className="w-4 h-4" />
                  </motion.button>
                </div>
                
                <div className="flex gap-2 bg-slate-500/5 p-1.5 rounded-[2rem]">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button" 
                    onClick={() => isVoiceRecording ? stopVoiceRecording() : startVoiceRecording()}
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all",
                      isVoiceRecording ? "bg-red-500 text-white animate-pulse shadow-xl shadow-red-500/20" : (isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm")
                    )}
                  >
                    <Mic className="w-4 h-4" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button" 
                    onClick={() => setIsGhostMode(!isGhostMode)}
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all",
                      isGhostMode ? "bg-slate-900 text-emerald-400 shadow-2xl border border-emerald-500/20" : (isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm")
                    )}
                  >
                    <Ghost className="w-4 h-4" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button" 
                    onClick={() => {
                      if (scheduledSendTime) {
                        setScheduledSendTime('');
                      } else {
                        // Get local time + 1 minute, formatted for datetime-local input
                        const now = new Date();
                        now.setMinutes(now.getMinutes() + 1);
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const day = String(now.getDate()).padStart(2, '0');
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        const localTimeStr = `${year}-${month}-${day}T${hours}:${minutes}`;
                        setScheduledSendTime(localTimeStr);
                      }
                    }}
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all",
                      scheduledSendTime ? "bg-blue-500 text-white shadow-2xl border border-blue-500/20" : (isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm")
                    )}
                    title="Schedule message"
                  >
                    <Clock className="w-4 h-4" />
                  </motion.button>
                </div>
                
                {/* Translation Controls */}
                <div className="flex gap-2 bg-slate-500/5 p-1.5 rounded-[2rem]">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button" 
                    onClick={() => setIsOutgoingTranslationEnabled(!isOutgoingTranslationEnabled)}
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all",
                      isOutgoingTranslationEnabled ? "bg-blue-500 text-white shadow-xl shadow-blue-500/20" : (isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm")
                    )}
                    title={isOutgoingTranslationEnabled ? "Translation enabled" : "Enable message translation"}
                  >
                    <Languages className="w-4 h-4" />
                  </motion.button>
                  
                  {isOutgoingTranslationEnabled && (
                    <>
                      <select
                        value={outgoingTargetLang}
                        onChange={(e) => setOutgoingTargetLang(e.target.value)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-bold border transition-all outline-none",
                          isDarkMode 
                            ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500" 
                            : "bg-white border-slate-200 text-slate-900 focus:border-blue-400"
                        )}
                        title="Select translation language"
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </option>
                        ))}
                      </select>
                      
                      {/* Translate Preview Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={async () => {
                          if (!inputMessage.trim()) {
                            addNotification('Please type a message first', 'warning');
                            return;
                          }
                          if (isPreviewMode) {
                            // Already in preview mode, restore original
                            setInputMessage(originalInputText);
                            setOriginalInputText('');
                            setIsPreviewMode(false);
                            addNotification('Restored original text', 'success');
                          } else {
                            // Translate and preview
                            setIsTranslatingOutgoing(true);
                            try {
                              const translated = await translateOutgoingMessage(inputMessage, outgoingTargetLang);
                              setOriginalInputText(inputMessage);
                              setInputMessage(translated);
                              setIsPreviewMode(true);
                            } catch (error) {
                              console.error('Preview translation failed:', error);
                            } finally {
                              setIsTranslatingOutgoing(false);
                            }
                          }
                        }}
                        disabled={!inputMessage.trim() || isTranslatingOutgoing}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                          isPreviewMode
                            ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                            : (isDarkMode 
                                ? "bg-slate-800 border border-slate-700 text-white hover:bg-slate-700" 
                                : "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50"),
                          (!inputMessage.trim() || isTranslatingOutgoing) && "opacity-50 cursor-not-allowed"
                        )}
                        title={isPreviewMode ? "Restore original text" : "Preview translation before sending"}
                      >
                        {isTranslatingOutgoing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isPreviewMode ? (
                          '↩ Original'
                        ) : (
                          '🔍 Preview'
                        )}
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {scheduledSendTime && (
                <div className={cn(
                  "px-3 py-2 rounded-lg border flex flex-col gap-2 text-xs",
                  isDarkMode ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600"
                )}>
                  {/* Time Selection */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <input
                      type="datetime-local"
                      value={scheduledSendTime}
                      onChange={(e) => setScheduledSendTime(e.target.value)}
                      className={cn(
                        "bg-transparent border-none outline-none text-xs font-black",
                        isDarkMode ? "text-blue-300" : "text-blue-600"
                      )}
                    />
                    {isScheduling && <Loader2 className="w-3 h-3 animate-spin" />}
                  </div>

                  {/* Recurring Toggle */}
                  <div className="flex items-center gap-2 pt-1 border-t border-blue-500/20">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="w-3 h-3 rounded border-blue-500/50"
                      />
                      <span className="font-black text-[10px] uppercase">Repeat</span>
                    </label>
                  </div>

                  {/* Recurring Options */}
                  {isRecurring && (
                    <div className="flex flex-col gap-2">
                      {/* Recurring Type */}
                      <select
                        value={recurringType}
                        onChange={(e) => setRecurringType(e.target.value as any)}
                        className={cn(
                          "bg-transparent border rounded px-2 py-1 text-[10px] font-black outline-none",
                          isDarkMode ? "border-blue-500/30 text-blue-300" : "border-blue-300 text-blue-600"
                        )}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="custom">Custom Days</option>
                      </select>

                      {/* Custom Days Selection */}
                      {recurringType === 'custom' && (
                        <div className="flex gap-1 flex-wrap">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                            <button
                              key={day}
                              onClick={() => {
                                setRecurringDays(prev =>
                                  prev.includes(idx)
                                    ? prev.filter(d => d !== idx)
                                    : [...prev, idx]
                                );
                              }}
                              className={cn(
                                "px-2 py-1 rounded text-[9px] font-black transition-all",
                                recurringDays.includes(idx)
                                  ? (isDarkMode ? "bg-blue-500 text-white" : "bg-blue-600 text-white")
                                  : (isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-600")
                              )}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Send Button - for when Redis is not running */}
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/message/process-scheduled', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: user._id })
                        });
                        if (response.ok) {
                          const data = await response.json();
                          if (data.processed > 0) {
                            addNotification(`📅 Sent ${data.processed} scheduled message(s)`, 'success');
                          } else {
                            addNotification('📅 No scheduled messages ready to send', 'info');
                          }
                        }
                      } catch (error) {
                        addNotification('Failed to process scheduled messages', 'error');
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase transition-all",
                      isDarkMode
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    Send Now
                  </button>
                </div>
              )}

              <div className="flex-1 flex items-center gap-3 order-1 md:order-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleMediaSelect}
                  accept="image/*,video/*"
                />
                <div className="flex-1 relative group">
                  {/* Multi-layered glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-purple-500/20 rounded-[3rem] blur-2xl opacity-0 group-focus-within:opacity-100 group-hover:opacity-60 transition-all duration-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 rounded-[3rem] md:rounded-[4rem] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                  {/* Translation Preview Indicator */}
                  {isPreviewMode && originalInputText && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs flex items-center gap-2 mb-2",
                        isDarkMode 
                          ? "bg-blue-500/10 border border-blue-500/30 text-blue-400" 
                          : "bg-blue-50 border border-blue-200 text-blue-600"
                      )}
                    >
                      <Globe className="w-3 h-3" />
                      <span className="font-bold">Showing translated text</span>
                      <span className="text-slate-400">|</span>
                      <span className="truncate max-w-[200px] opacity-70">
                        Original: {originalInputText.slice(0, 50)}{originalInputText.length > 50 ? '...' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setInputMessage(originalInputText);
                          setOriginalInputText('');
                          setIsPreviewMode(false);
                        }}
                        className="ml-auto text-amber-500 hover:text-amber-600 font-bold text-[10px] uppercase"
                      >
                        Restore
                      </button>
                    </motion.div>
                  )}

                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => {
                      handleTyping(e);
                      // If user types in preview mode, exit preview mode
                      if (isPreviewMode && e.target.value !== inputMessage) {
                        setIsPreviewMode(false);
                        setOriginalInputText('');
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(e)}
                    placeholder={
                      isGhostMode
                        ? "🔮 Quantum Ghost message..."
                        : activeTab === 'blind'
                          ? "👻 Send anonymous message..."
                          : activeTab === 'ai'
                            ? "🤖 Ask AI Assistant..."
                            : isListening
                              ? "🎤 Listening... Speak now"
                              : "✨ Type your message..."
                    }
                    className={cn(
                      "relative w-full px-5 md:px-7 pr-14 md:pr-16 py-3 md:py-4 border-2 rounded-[2rem] md:rounded-[2.5rem] outline-none text-[12px] md:text-sm font-bold transition-all duration-300 shadow-2xl backdrop-blur-xl",
                      isDarkMode
                        ? "bg-slate-900/70 border-slate-600/50 text-white placeholder-slate-500 focus:border-emerald-500/70 focus:bg-slate-800/80 focus:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                        : "bg-white/90 border-slate-300/50 text-slate-900 placeholder-slate-400 focus:border-emerald-500/70 focus:bg-white focus:shadow-[0_0_30px_rgba(16,185,129,0.1)]",
                      isGhostMode && "font-mono italic text-emerald-400 border-emerald-500/50 bg-emerald-500/10 focus:shadow-[0_0_30px_rgba(16,185,129,0.2)]",
                      activeTab === 'blind' && !isGhostMode && "border-purple-500/50 focus:border-purple-500/70 focus:shadow-[0_0_30px_rgba(139,92,246,0.15)] bg-purple-500/10",
                      isListening && "border-red-500/50 focus:border-red-500/70 focus:shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                    )}
                  />
                  {activeTab === 'blind' && !isGhostMode && (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <motion.div
                        animate={{ 
                          opacity: [0.6, 1, 0.6],
                          scale: [0.95, 1, 0.95]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-2 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20"
                      >
                        <Ghost className="w-3 h-3 text-purple-500" />
                        <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest">Anonymous</span>
                      </motion.div>
                    </div>
                  )}
                  {isGhostMode && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <motion.div
                        animate={{ 
                          opacity: [0.4, 1, 0.4],
                          scale: [0.95, 1, 0.95]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20"
                      >
                        <Fingerprint className="w-4 h-4 text-emerald-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Quantum Encrypted</span>
                      </motion.div>
                    </div>
                  )}

                  {/* Advanced Voice Input Button */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isListening) {
                        stopVoiceInput();
                      } else {
                        startVoiceInput();
                      }
                    }}
                    className={cn(
                      "absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-2 z-20 cursor-pointer",
                      isListening 
                        ? "bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-400/50 shadow-red-500/40 animate-pulse" 
                        : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-400/30 shadow-emerald-500/30 hover:shadow-emerald-500/50"
                    )}
                  >
                    {isListening ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
                  </motion.button>

                </div>
                
                {/* Advanced Send Button */}
                <motion.button 
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!inputMessage.trim() || isTranslatingOutgoing}
                  className={cn(
                    "w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-[2rem] md:rounded-[2.5rem] transition-all duration-300 shadow-2xl disabled:opacity-40 group relative overflow-hidden border-2",
                    isTranslatingOutgoing 
                      ? "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white shadow-blue-500/40"
                      : "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60",
                    "disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none disabled:border-slate-600",
                    "border-white/20 hover:border-white/40"
                  )}
                >
                  {/* Ripple effect on send */}
                  <AnimatePresence>
                    {inputMessage.trim() && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0.5 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="absolute inset-0 bg-white/30 rounded-[2.5rem] md:rounded-[3rem]"
                      />
                    )}
                  </AnimatePresence>
                  
                  {/* Shimmer background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  {isTranslatingOutgoing ? (
                    <Languages className="w-6 h-6 md:w-7 md:h-7 relative z-10 animate-pulse" />
                  ) : (
                    <Send className="w-6 h-6 md:w-7 md:h-7 relative z-10 transition-transform group-hover:rotate-12" />
                  )}
                </motion.button>
                </div>
            </form>
          </div>
          )}
          </>
        )}
        </section>

        {/* Friends Modal */}
        <AnimatePresence>
          {showFriendsModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={cn(
                  "w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative",
                  isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                )}
              >
                <button 
                  onClick={() => setShowFriendsModal(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Friends & Requests</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Manage your network</p>
                  </div>
                </div>

                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Add Friend by Search */}
                  <div className="mb-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Add Friend by Name/ID</h4>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={searchFriendInput}
                        onChange={(e) => setSearchFriendInput(e.target.value)}
                        placeholder="Enter name or user ID..."
                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                      <button 
                        onClick={sendFriendRequestBySearch}
                        disabled={isSearchingFriend}
                        className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 disabled:opacity-50 transition-all"
                      >
                        {isSearchingFriend ? '...' : 'Add'}
                      </button>
                    </div>
                  </div>

                  {friendRequests.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pending Requests</h4>
                      <div className="space-y-2">
                        {friendRequests.map(req => (
                          <div key={req._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img src={req.from.pic} alt={req.from.name} className="w-8 h-8 rounded-lg object-cover" />
                                {verifiedUsers.has(req.from._id) && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <Check className="w-2 h-2 text-white" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-sm font-bold">{req.from.name}</span>
                                {verifiedUsers.has(req.from._id) && (
                                  <span className="ml-1 text-xs text-emerald-500">✅</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => respondToFriendRequest(req._id, 'accepted')}
                                className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => respondToFriendRequest(req._id, 'rejected')}
                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sentFriendRequests.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sent Requests</h4>
                      <div className="space-y-2">
                        {sentFriendRequests.map(req => (
                          <div key={req._id} className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img src={typeof req.to === 'string' ? '/default-avatar.png' : req.to.pic} alt={typeof req.to === 'string' ? 'User' : req.to.name} className="w-8 h-8 rounded-lg object-cover" />
                                {verifiedUsers.has(typeof req.to === 'string' ? req.to : req.to._id) && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <Check className="w-2 h-2 text-white" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-sm font-bold">{req.to.name}</span>
                                {verifiedUsers.has(typeof req.to === 'string' ? req.to : req.to._id) && (
                                  <span className="ml-1 text-xs text-emerald-500">✅</span>
                                )}
                                <p className="text-[10px] text-blue-600 dark:text-blue-400">Request sent</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => cancelFriendRequest(req._id)}
                              className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all"
                              title="Cancel Request"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cancelledRequests.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cancelled Requests</h4>
                      <div className="space-y-2">
                        {cancelledRequests.map(req => (
                          <div key={req._id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img src={typeof req.to === 'string' ? '/default-avatar.png' : req.to.pic} alt={typeof req.to === 'string' ? 'User' : req.to.name} className="w-8 h-8 rounded-lg object-cover opacity-60" />
                                {verifiedUsers.has(typeof req.to === 'string' ? req.to : req.to._id) && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <Check className="w-2 h-2 text-white" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{req.to.name}</span>
                                {verifiedUsers.has(typeof req.to === 'string' ? req.to : req.to._id) && (
                                  <span className="ml-1 text-xs text-emerald-500">✅</span>
                                )}
                                <p className="text-[10px] text-gray-500 dark:text-gray-500">
                                  Cancelled {req.cancelledAt ? new Date(req.cancelledAt).toLocaleDateString() : 'recently'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => restoreFriendRequest(req._id)}
                                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                                title="Restore Request"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setCancelledRequests(prev => prev.filter(r => r._id !== req._id));
                                  showBrowserNotification('Request Removed', 'Cancelled request removed permanently');
                                }}
                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Your Friends</h4>
                    {friends.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500 italic">No friends yet. Add some from the network!</p>
                        <button
                          onClick={async () => {
                            if (!user?._id) return;
                            try {
                              const res = await fetch(`/api/friends/seed/${user._id}`, { method: 'POST' });
                              if (res.ok) {
                                const data = await res.json();
                                // Refresh friends list
                                const friendsRes = await fetch(`/api/friends/${user._id}`);
                                if (friendsRes.ok) {
                                  const friendsData = await friendsRes.json();
                                  setFriends(friendsData);
                                  localStorage.setItem('friends', JSON.stringify(friendsData));
                                }
                                showBrowserNotification('Sample Friends Added', `Added John & Shreya with chat history!`, 'success');
                              }
                            } catch (e) {
                              console.error('Seed friends error:', e);
                            }
                          }}
                          className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:from-purple-600 hover:to-pink-600 transition-all"
                        >
                          Add Sample Friends (John & Shreya) 🎉
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {friends.map(f => (
                          <div key={f._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <AnimatedAvatar username={f.name} size={32} user={f} />
                                {verifiedUsers.has(f._id) && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <Check className="w-2 h-2 text-white" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-sm font-bold">{f.name}</span>
                                {verifiedUsers.has(f._id) && (
                                  <span className="ml-1 text-xs text-emerald-500">✅</span>
                                )}
                              </div>
                            </div>
                            {!verifiedUsers.has(f._id) && (
                              <button 
                                onClick={() => verifyEntity(f.name)}
                                className="px-3 py-1 bg-emerald-500 text-white text-xs font-black rounded-lg hover:bg-emerald-600 transition-all"
                              >
                                Verify
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Member Modal */}
        <AnimatePresence>
          {showAddMemberModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={cn(
                  "w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative",
                  isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                )}
              >
                <button 
                  onClick={() => setShowAddMemberModal(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Add Member</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Expand your group</p>
                  </div>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {allUsers.filter(u => u._id !== user._id && !selectedGroup?.members.some(m => m._id === u._id)).map(u => (
                    <div key={u._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <AnimatedAvatar username={u.name} size={32} user={u} />
                          {verifiedUsers.has(u._id) && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                              <Check className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-bold">
                          {u.name}
                          {verifiedUsers.has(u._id) && (
                            <span className="ml-1 text-xs text-emerald-500">✅</span>
                          )}
                        </span>
                      </div>
                      <button 
                        onClick={() => addMemberToGroup(u._id)}
                        className="px-4 py-2 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
                </motion.div>
              </div>
            )}
        </AnimatePresence>

        {/* Group Info Modal */}
        <AnimatePresence>
          {showGroupInfo && selectedGroup && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowGroupInfo(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={cn(
                  "relative w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border z-10",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                )}
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className={cn("text-xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>GROUP INFO</h3>
                  <button onClick={() => setShowGroupInfo(false)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex flex-col items-center mb-8">
                  <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-[2rem] shadow-xl relative overflow-hidden border-2 border-white dark:border-slate-700">
                      <AnimatedAvatar username={selectedGroup.name} size={96} profilePic={selectedGroup.pic} />
                    </div>
                    {(selectedGroup.admin === user._id || (typeof selectedGroup.admin === 'object' && selectedGroup.admin._id === user._id)) && (
                      <label className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-emerald-600 transition-colors shadow-lg">
                        <Camera className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setGroupDPUpload(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <h4 className={cn("text-2xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>{selectedGroup.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p className="text-slate-400 font-bold text-xs">{selectedGroup.members.length} Members</p>
                  </div>
                  {groupDPUpload && (
                    <div className="mt-4 w-full">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-black text-emerald-500">{groupDPUpload.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setGroupDPUpload(null)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleGroupDPUpload}
                            disabled={isUploadingGroupDP}
                            className="text-emerald-500 hover:text-emerald-600 transition-colors disabled:opacity-50"
                          >
                            {isUploadingGroupDP ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Members</label>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                      {selectedGroup.members.map(m => (
                        <div key={m._id} className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all hover:shadow-lg", isDarkMode ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800/70" : "bg-slate-50 border-slate-100 hover:bg-white hover:shadow-slate-200/50")}>
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img src={m.pic} alt={m.name} className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-500/20" />
                              {(selectedGroup.admin === m._id || (typeof selectedGroup.admin === 'object' && selectedGroup.admin._id === m._id)) && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={cn("text-sm font-black", isDarkMode ? "text-white" : "text-slate-900")}>{m.name}</p>
                                {m._id === user._id && (
                                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">You</span>
                                )}
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {m._id}</p>
                              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">
                                {(selectedGroup.admin === m._id || (typeof selectedGroup.admin === 'object' && selectedGroup.admin._id === m._id)) ? "Admin" : "Member"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {(selectedGroup.admin === user._id || (typeof selectedGroup.admin === 'object' && selectedGroup.admin._id === user._id)) && (
                      <button 
                        onClick={() => setShowAddMemberModal(true)}
                        className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        Add Member
                      </button>
                    )}
                    <button 
                      onClick={() => handleExitGroup(selectedGroup._id)}
                      className="flex-1 py-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all"
                    >
                      Exit Group
                    </button>
                    {(selectedGroup.admin === user._id || (typeof selectedGroup.admin === 'object' && selectedGroup.admin._id === user._id)) ? (
                      <button 
                        onClick={() => handleDeleteGroup(selectedGroup._id)}
                        className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                      >
                        Delete Group
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleDeleteGroupForUser(selectedGroup._id)}
                        className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                      >
                        Delete for Me
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* New Group Modal */}
        <AnimatePresence>
          {showNewGroupModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNewGroupModal(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={cn(
                  "relative w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border z-10",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                )}
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className={cn("text-xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>CREATE NEW GROUP</h3>
                  <button onClick={() => setShowNewGroupModal(false)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Group Name</label>
                    <input 
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter group name..."
                      className={cn(
                        "w-full px-6 py-4 rounded-2xl text-sm font-bold outline-none border transition-all",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-100 text-slate-900 focus:border-emerald-500"
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Select Members</label>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {allUsers.filter(u => u._id !== user._id).map(u => (
                        <div 
                          key={u._id}
                          onClick={() => {
                            if (newGroupMembers.includes(u._id)) {
                              setNewGroupMembers(prev => prev.filter(id => id !== u._id));
                            } else {
                              setNewGroupMembers(prev => [...prev, u._id]);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border",
                            newGroupMembers.includes(u._id)
                              ? (isDarkMode ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200")
                              : (isDarkMode ? "bg-slate-800/50 border-transparent hover:border-slate-700" : "bg-slate-100/50 border-transparent hover:border-slate-200")
                          )}
                        >
                          <AnimatedAvatar username={u.name} size={40} user={u} />
                          <span className={cn("text-sm font-bold", isDarkMode ? "text-slate-200" : "text-slate-700")}>{u.name}</span>
                          {newGroupMembers.includes(u._id) && <div className="ml-auto w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white"><Check className="w-3 h-3" /></div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={createGroup}
                    disabled={!newGroupName.trim() || newGroupMembers.length === 0}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    Create Group
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Profile Sidebar */}
        <ProfileSidebar
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          user={user}
          isDarkMode={isDarkMode}
          onLogout={handleLogout}
          onProfilePicUpdate={handleProfilePicUpdate}
          onProfilePicRemove={handleProfilePicRemove}
          profilePic={profilePic}
          isVerified={user?.isVerified || false}
          onLanguageChange={(langCode) => {
            const updatedUser = { ...user, preferredLanguage: langCode };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            // Optionally sync with server
            try {
              fetch('/api/user/language', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?._id, preferredLanguage: langCode })
              });
            } catch (error) {
              console.error('Failed to update language on server:', error);
            }
          }}
        />

        
        {/* About (in-chat) */}
        <AnimatePresence>
          {showAboutChat && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[125] flex items-center justify-center p-4 md:p-8 bg-black/70 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.96, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 12 }}
                className={cn(
                  "w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2rem] border shadow-2xl p-8 md:p-12 relative",
                  isDarkMode ? "bg-slate-900/95 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                )}
              >
                <button
                  type="button"
                  onClick={() => setShowAboutChat(false)}
                  className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
                <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em] mb-3">IntelliCall</p>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">{INTELLICALL_ABOUT.headline}</h2>
                <p className="text-slate-400 font-bold text-sm leading-relaxed mb-10">{INTELLICALL_ABOUT.description}</p>
                <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500 mb-6">Our team</h3>
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  {TEAM_MEMBERS.map((member, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-4 p-4 rounded-2xl border",
                        isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"
                      )}
                    >
                      <img src={member.image} alt="" className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-black">{member.name}</p>
                        <p className="text-[11px] text-emerald-500/90 font-bold mt-1">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 font-bold">
                  Tip: On video calls, use the filter chips on your preview — they are cosmetic and only affect how you see yourself.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Settings Modal */}
        <AnimatePresence>
          {showChatSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[130] flex items-center justify-center p-4 md:p-8 bg-black/70 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.96, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 12 }}
                className={cn(
                  "w-full max-w-md overflow-hidden rounded-[2rem] border shadow-2xl relative",
                  isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                )}
              >
                <div className={cn("p-6 border-b flex items-center justify-between", isDarkMode ? "border-slate-800" : "border-slate-100")}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                      <Settings className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight">Settings</h2>
                  </div>
                  <button
                    onClick={() => setShowChatSettings(false)}
                    className="p-2 rounded-xl bg-slate-800/10 text-slate-500 hover:bg-slate-800/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Theme Settings */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Appearance</h3>
                    <div className={cn("flex items-center justify-between p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100")}>
                      <div className="flex items-center gap-3">
                        {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                        <div>
                          <p className="font-bold text-sm">Dark Mode</p>
                          <p className="text-xs text-slate-500">Toggle application theme</p>
                        </div>
                      </div>
                      <button
                        onClick={toggleDarkMode}
                        className={cn(
                          "w-12 h-6 rounded-full relative transition-colors",
                          isDarkMode ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          isDarkMode ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Notifications</h3>
                    <div className={cn("flex items-center justify-between p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100")}>
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-bold text-sm">Push Notifications</p>
                          <p className="text-xs text-slate-500">Get alerts for new messages</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (Notification.permission !== "granted") {
                            Notification.requestPermission();
                          } else {
                            alert("Notifications are already enabled. You can disable them in your browser settings.");
                          }
                        }}
                        className={cn(
                          "w-12 h-6 rounded-full relative transition-colors",
                          Notification.permission === "granted" ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          Notification.permission === "granted" ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Privacy Settings */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Privacy</h3>
                    <div className={cn("flex items-center justify-between p-4 rounded-2xl border", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100")}>
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-rose-500" />
                        <div>
                          <p className="font-bold text-sm">Ghost Mode</p>
                          <p className="text-xs text-slate-500">Messages disappear after reading</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsGhostMode(!isGhostMode)}
                        className={cn(
                          "w-12 h-6 rounded-full relative transition-colors",
                          isGhostMode ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          isGhostMode ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forward Message Modal */}
        <ForwardMessageModal
          isOpen={showForwardModal}
          onClose={() => setShowForwardModal(false)}
          message={messageToForward}
          currentUser={user}
          friends={friends}
          groups={groups}
          onForward={handleForwardConfirm}
          isDarkMode={isDarkMode}
          onlineUsers={onlineUsers}
        />

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirmModal.show && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={cn(
                  "w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden",
                  isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                )}
              >
                <div className={cn(
                  "absolute top-0 left-0 w-full h-2",
                  showConfirmModal.type === 'danger' ? "bg-red-500" : (showConfirmModal.type === 'warning' ? "bg-orange-500" : "bg-emerald-500")
                )} />
                
                <div className="flex flex-col items-center text-center mt-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
                    showConfirmModal.type === 'danger' ? "bg-red-500/10 text-red-500" : (showConfirmModal.type === 'warning' ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500")
                  )}>
                    {showConfirmModal.type === 'danger' ? <Trash2 className="w-8 h-8" /> : (showConfirmModal.type === 'warning' ? <AlertTriangle className="w-8 h-8" /> : <Info className="w-8 h-8" />)}
                  </div>
                  
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{showConfirmModal.title}</h3>
                  <p className={cn("text-sm font-bold leading-relaxed mb-8", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    {showConfirmModal.message}
                  </p>
                  
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setShowConfirmModal(prev => ({ ...prev, show: false }))}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                        isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      )}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={showConfirmModal.onConfirm}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all text-white shadow-lg",
                        showConfirmModal.type === 'danger' ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : (showConfirmModal.type === 'warning' ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20")
                      )}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Team Info Modal */}
        <AnimatePresence>
          {showTeamModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className={cn(
                  "w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-8 shadow-2xl relative",
                  isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                )}
              >
                <button 
                  onClick={() => setShowTeamModal(false)}
                  className={cn("absolute top-6 right-6 p-3 rounded-full transition-colors z-10", isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100")}
                >
                  <X className="w-6 h-6" />
                </button>
                
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-full text-sm font-black mb-6">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">Communication Redefined</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight mb-4">
                    <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">IntelliCall</span>
                  </h2>
                  <p className={cn("text-base max-w-3xl mx-auto mb-12 font-medium", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                    Experience the future of communication with real-time messaging, AI-powered assistance, and crystal-clear video calls
                  </p>
                  
                  <div className="grid grid-cols-3 gap-6 mb-16 max-w-2xl mx-auto">
                    <div className="group relative">
                      <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
                      <div className="relative p-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <div className="text-lg font-black text-emerald-500 mb-1">Instant</div>
                        <div className={cn("text-xs uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-600")}>Messaging</div>
                      </div>
                    </div>
                    <div className="group relative">
                      <div className="absolute inset-0 bg-purple-500/10 rounded-2xl blur-xl group-hover:bg-purple-500/20 transition-all"></div>
                      <div className="relative p-6 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                          <Bot className="w-6 h-6" />
                        </div>
                        <div className="text-lg font-black text-purple-500 mb-1">Smart</div>
                        <div className={cn("text-xs uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-600")}>AI Assistant</div>
                      </div>
                    </div>
                    <div className="group relative">
                      <div className="absolute inset-0 bg-red-500/10 rounded-2xl blur-xl group-hover:bg-red-500/20 transition-all"></div>
                      <div className="relative p-6 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                          <Video className="w-6 h-6" />
                        </div>
                        <div className="text-lg font-black text-red-500 mb-1">HD</div>
                        <div className={cn("text-xs uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-600")}>Video Calls</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-0">
                      <Users className="w-5 h-5 text-emerald-500" />
                      <h3 className="text-xl font-black bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">Meet Our Team</h3>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                    {TEAM_MEMBERS.map((member, idx) => (
                      <motion.div
                        key={member.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                        className={cn("group text-center p-8 rounded-3xl border-2 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105", isDarkMode ? "border-emerald-500/20 bg-slate-800/50 backdrop-blur-sm" : "border-emerald-500/10 bg-white/80 backdrop-blur-sm")}
                      >
                        <div className="relative mb-6">
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full opacity-30 blur-2xl group-hover:opacity-50 transition-opacity"></div>
                          <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-2xl group-hover:border-emerald-500/50 transition-all">
                            <img
                              src={member.image}
                              alt={member.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        </div>
                        <div className={`w-10 h-10 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-xl group-hover:shadow-2xl transition-all`}>
                          <member.icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-black text-lg mb-2 group-hover:text-emerald-500 transition-colors">{member.name}</h3>
                        <p className="text-sm font-bold text-emerald-500 uppercase tracking-wider">{member.role}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Incoming Call Overlay */}
        <AnimatePresence>
          {incomingCall && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="fixed bottom-10 right-6 left-6 md:left-auto md:right-10 bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl z-[110] border border-white/10 w-full max-w-[350px]"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl animate-pulse">
                  <User className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black mb-1 tracking-tighter">{incomingCall.from}</h3>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-8">Incoming {incomingCall.type} Call</p>
                
                <div className="flex gap-4 w-full">
                  <button onClick={rejectCall} className="flex-1 py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Decline</button>
                  <button onClick={acceptCall} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"><PhoneIncoming className="w-4 h-4" /> Accept</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Call Overlay */}
        <AnimatePresence>
          {isGroupCalling && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950 z-[120] flex flex-col"
            >
              <div className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800">
                <h3 className="text-white font-black">{selectedGroup?.name} - Group Call</h3>
                <button 
                  onClick={() => setIsGroupCalling(false)}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  End Group Call
                </button>
              </div>
              <iframe 
                src={`https://meet.jit.si/${groupCallRoom}`}
                allow="camera; microphone; fullscreen; display-capture"
                className="w-full flex-1 border-none"
              />
            </motion.div>
          )}
          {isCalling && !isGroupCalling && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-black z-[120] flex flex-col items-center justify-center p-6 md:p-12"
            >
              <audio ref={remoteAudioRef} autoPlay playsInline preload="auto" className="hidden" />
              <canvas ref={canvasRef} className="hidden" width="640" height="480" />
              <div className="relative w-full max-w-6xl aspect-video bg-black rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_0_80px_-12px_rgba(16,185,129,0.35)] border border-emerald-500/20">
                {callType === 'video' ? (
                  <div className="w-full h-full relative">
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute top-6 right-6 md:top-10 md:right-10 w-28 h-40 md:w-44 md:h-64 bg-slate-900/90 rounded-2xl md:rounded-3xl border-2 border-emerald-500/40 overflow-hidden shadow-2xl ring-2 ring-emerald-500/20">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 max-w-[95%] z-20">
                      {VIDEO_CALL_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setVideoCallFilterId(f.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md transition-all",
                            videoCallFilterId === f.id
                              ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30"
                              : "bg-black/50 border-white/15 text-white/90 hover:border-emerald-500/50"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black relative">
                    <div className="w-44 h-44 rounded-full bg-emerald-500/15 flex items-center justify-center animate-pulse ring-4 ring-emerald-500/20">
                      <div className="w-36 h-36 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white shadow-2xl">
                        <Phone className="w-16 h-16" />
                      </div>
                    </div>
                    <h3 className="mt-10 text-white font-black text-3xl md:text-4xl tracking-tight">Voice call</h3>
                    <p className="text-emerald-400 font-black text-xs uppercase tracking-[0.35em] mt-3">Audio connected</p>
                  </div>
                )}
                
                <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/50 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/10">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white text-[10px] font-black tracking-[0.25em] uppercase">Live</span>
                </div>

                {/* Subtitles Overlay */}
                {(isCallTranslatorEnabled || subtitles.length > 0 || callSubtitles.length > 0 || translatorInterim) && (
                  <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
                    <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                          {isCallTranslatorEnabled 
                            ? (SUPPORTED_LANGUAGES.find(l => l.code === callTranslatorTargetLang)?.name || 'Translation')
                            : 'Subtitles'
                          }
                        </span>
                        {isTranslatorListening && (
                          <span className="text-emerald-400 text-[10px] animate-pulse ml-auto">● Listening</span>
                        )}
                      </div>
                      {/* Error Display */}
                      {translatorError && (
                        <div className="text-red-400 text-xs mb-2">⚠️ {translatorError}</div>
                      )}
                      {/* Interim (speaking) transcript */}
                      {translatorInterim && (
                        <div className="text-sm text-emerald-200/60 italic">
                          <span className="text-[10px] opacity-50 mr-2">You (speaking...)</span>
                          {translatorInterim}
                        </div>
                      )}
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {[...subtitles, ...callSubtitles].length === 0 && isTranslatorListening && (
                          <div className="text-sm text-white/50 italic">
                            Start speaking... Your speech will appear here as subtitles
                          </div>
                        )}
                        {[...subtitles, ...callSubtitles].slice(-4).map((sub, idx) => (
                          <div key={sub.id || idx} className={`text-sm ${sub.speaker === 'me' ? 'text-emerald-300' : 'text-white'}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] opacity-50 mt-0.5 shrink-0">
                                {sub.speaker === 'me' ? 'You' : 'Remote'}
                              </span>
                              <div className="flex-1 min-w-0">
                                {/* Show text - if translation pending, show original with loading */}
                                <span className="font-medium">
                                  {sub.translatedText || sub.text}
                                  {!sub.translatedText && (
                                    <span className="inline-flex items-center ml-2">
                                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse mr-0.5" />
                                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse delay-75 mr-0.5" />
                                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse delay-150" />
                                    </span>
                                  )}
                                </span>
                                {/* Show original text below if translation exists and is different */}
                                {sub.translatedText && sub.translatedText !== sub.text && (
                                  <span className="block text-[10px] opacity-50 mt-0.5">
                                    Original: {sub.text}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Manual Input - Shows when mic is busy during call */}
                      {isTranslatorManualMode && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              id="manualSubtitleInput"
                              placeholder="Type what you said..."
                              className="flex-1 bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const input = e.target as HTMLInputElement;
                                  if (input.value.trim()) {
                                    addManualSubtitle(input.value.trim());
                                    input.value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById('manualSubtitleInput') as HTMLInputElement;
                                if (input && input.value.trim()) {
                                  addManualSubtitle(input.value.trim());
                                  input.value = '';
                                }
                              }}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Send
                            </button>
                          </div>
                          <p className="text-[10px] text-white/40 mt-1">
                            Microphone busy by call. Type your message to send as subtitle.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-5 z-30">
                  <button 
                    type="button" 
                    onClick={toggleMute}
                    className={cn(
                      "w-12 h-12 md:w-14 md:h-14 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white border border-white/10 transition-all",
                      isMuted ? "bg-red-500/20 border-red-500/50" : "bg-white/10"
                    )}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  
                  {/* Translator Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowCallTranslatorSettings(true)}
                    className={cn(
                      "w-12 h-12 md:w-14 md:h-14 backdrop-blur-xl rounded-2xl flex items-center justify-center border transition-all relative",
                      isCallTranslatorEnabled 
                        ? "bg-emerald-500/30 border-emerald-500/50 text-emerald-300" 
                        : "bg-white/10 border-white/10 text-white/70 hover:text-white"
                    )}
                    title="Call Translator"
                  >
                    <Languages className="w-5 h-5" />
                    {isCallTranslatorEnabled && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    )}
                  </button>
                  
                  <button type="button" onClick={endCall} className="w-16 h-16 md:w-20 md:h-20 bg-red-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-red-500/50 hover:bg-red-600 transition-all active:scale-95">
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  
                  {callType === 'video' && (
                    <button 
                      type="button" 
                      onClick={toggleCamera}
                      className={cn(
                        "w-12 h-12 md:w-14 md:h-14 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white border border-white/10 transition-all",
                        isCameraOff ? "bg-red-500/20 border-red-500/50" : "bg-white/10"
                      )}
                      title={isCameraOff ? "Turn on camera" : "Turn off camera"}
                    >
                      {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-8 flex flex-col items-center text-center">
                <div className="flex items-center gap-2 text-emerald-500/60 mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Peer connection</span>
                  {isCallTranslatorEnabled && (
                    <>
                      <span className="text-white/30">|</span>
                      <Globe className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 text-[10px] font-black uppercase">Translator ON</span>
                    </>
                  )}
                </div>
                <p className="text-white/35 text-[10px] font-bold uppercase tracking-widest">IntelliCall</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Translator Settings Modal */}
        <AnimatePresence>
          {showCallTranslatorSettings && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[130] flex items-center justify-center p-4"
              onClick={() => setShowCallTranslatorSettings(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                    <Languages className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Call Translator</h3>
                    <p className="text-emerald-400/70 text-xs">Real-time translation with subtitles</p>
                  </div>
                </div>

                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between mb-6 p-4 bg-slate-800/50 rounded-2xl">
                  <span className="text-white font-medium">Enable Translator</span>
                  <button
                    onClick={() => setIsCallTranslatorEnabled(!isCallTranslatorEnabled)}
                    className={cn(
                      "w-14 h-7 rounded-full transition-all relative",
                      isCallTranslatorEnabled ? "bg-emerald-500" : "bg-slate-600"
                    )}
                  >
                    <span className={cn(
                      "absolute top-1 w-5 h-5 bg-white rounded-full transition-all",
                      isCallTranslatorEnabled ? "left-8" : "left-1"
                    )} />
                  </button>
                </div>

                {/* Source Language Selection */}
                <div className="mb-4">
                  <label className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                    You Speak (Source Language)
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    <button
                      onClick={() => setCallTranslatorSourceLang('auto')}
                      className={cn(
                        "p-3 rounded-xl text-left transition-all border",
                        callTranslatorSourceLang === 'auto'
                          ? "bg-emerald-500/20 border-emerald-500/50"
                          : "bg-slate-800/50 border-slate-700 hover:border-emerald-500/30"
                      )}
                    >
                      <span className="text-xl block mb-1">🌐</span>
                      <span className={cn(
                        "text-xs font-medium block",
                        callTranslatorSourceLang === 'auto' ? "text-emerald-300" : "text-white/70"
                      )}>
                        Auto Detect
                      </span>
                    </button>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={`src-${lang.code}`}
                        onClick={() => setCallTranslatorSourceLang(lang.code)}
                        className={cn(
                          "p-3 rounded-xl text-left transition-all border",
                          callTranslatorSourceLang === lang.code
                            ? "bg-emerald-500/20 border-emerald-500/50"
                            : "bg-slate-800/50 border-slate-700 hover:border-emerald-500/30"
                        )}
                      >
                        <span className="text-xl block mb-1">{lang.flag}</span>
                        <span className={cn(
                          "text-xs font-medium block",
                          callTranslatorSourceLang === lang.code ? "text-emerald-300" : "text-white/70"
                        )}>
                          {lang.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Language Selection */}
                <div className="mb-4">
                  <label className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                    Translate to (Target Language)
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setCallTranslatorTargetLang(lang.code)}
                        className={cn(
                          "p-3 rounded-xl text-left transition-all border",
                          callTranslatorTargetLang === lang.code
                            ? "bg-emerald-500/20 border-emerald-500/50"
                            : "bg-slate-800/50 border-slate-700 hover:border-emerald-500/30"
                        )}
                      >
                        <span className="text-xl block mb-1">{lang.flag}</span>
                        <span className={cn(
                          "text-xs font-medium block",
                          callTranslatorTargetLang === lang.code ? "text-emerald-300" : "text-white/70"
                        )}>
                          {lang.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                {translatorError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-red-400 text-xs">{translatorError}</p>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setIsCallTranslatorEnabled(false);
                      clearSubtitles();
                      setShowCallTranslatorSettings(false);
                    }}
                    className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-all"
                  >
                    Disable
                  </button>
                  <button
                    onClick={() => setShowCallTranslatorSettings(false)}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story Viewer Modal */}
        <AnimatePresence>
          {showStoryViewer && activeStory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4"
              onClick={() => setShowStoryViewer(false)}
            >
              <StoryViewTracker storyId={activeStory.id} setViewedStories={setViewedStories} />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative max-w-md w-full h-[600px] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative h-full">
                  {/* Story Progress Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                  
                  {/* Story Media */}
                  {activeStory.mediaType === 'video' ? (
                    <video
                      src={activeStory.mediaUrl}
                      autoPlay
                      className="w-full h-full object-contain"
                      onEnded={() => {
                        // Auto advance to next story
                        const currentIndex = stories.findIndex(s => s.id === activeStory.id);
                        if (currentIndex < stories.length - 1) {
                          setActiveStory(stories[currentIndex + 1]);
                        } else {
                          setShowStoryViewer(false);
                        }
                      }}
                    />
                  ) : (
                    <img 
                      src={activeStory.mediaUrl}
                      alt={activeStory.userName}
                      className="w-full h-full object-contain"
                    />
                  )}
                  
                  {/* Navigation Arrows */}
                  <button 
                    onClick={() => {
                      const currentIndex = stories.findIndex(s => s.id === activeStory.id);
                      if (currentIndex > 0) {
                        setActiveStory(stories[currentIndex - 1]);
                      }
                    }}
                    disabled={stories.findIndex(s => s.id === activeStory.id) === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <button 
                    onClick={() => {
                      const currentIndex = stories.findIndex(s => s.id === activeStory.id);
                      if (currentIndex < stories.length - 1) {
                        setActiveStory(stories[currentIndex + 1]);
                      } else {
                        setShowStoryViewer(false);
                      }
                    }}
                    disabled={stories.findIndex(s => s.id === activeStory.id) === stories.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                  </button>
                  
                  {/* Story Info and Actions */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-2">
                      <img 
                        src={activeStory.userPic}
                        alt={activeStory.userName}
                        className="w-8 h-8 rounded-full border-2 border-white"
                      />
                      <span className="text-white text-sm font-bold">{activeStory.userName}</span>
                    </div>
                    <div className="flex gap-2">
                      {/* Delete button for own stories */}
                      {activeStory.userName === user.name && (
                        <button 
                          onClick={() => {
                            deleteStory(activeStory.id);
                            setShowStoryViewer(false);
                          }}
                          className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => setShowStoryViewer(false)}
                        className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Like and Comment Section */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          // Toggle like functionality
                          const updatedStory = { ...activeStory, liked: !activeStory.liked };
                          setStories(prev => prev.map(s => 
                            s.id === activeStory.id ? updatedStory : s
                          ));
                          
                          // Send like to server
                          propSocket?.emit('story_like', {
                            storyId: activeStory.id,
                            user: user.name,
                            action: activeStory.liked ? 'unlike' : 'like'
                          });
                        }}
                        className={cn(
                          "px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-bold hover:bg-emerald-600 transition-colors",
                          activeStory.liked ? "bg-red-500 hover:bg-red-600" : ""
                        )}
                      >
                        {activeStory.liked ? '❤️' : '🤍'} {activeStory.likes?.length || 0}
                      </button>
                      
                      <button 
                        onClick={() => setShowCommentBox(activeStory.id)}
                        className="px-4 py-2 bg-slate-600 text-white rounded-full text-sm font-bold hover:bg-slate-700 transition-colors"
                      >
                        💬 {activeStory.comments?.length || 0}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comment Box Section */}
        <AnimatePresence>
          {showCommentBox && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl z-[160] p-4"
              onClick={() => setShowCommentBox(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 bg-emerald-50 flex items-center justify-center">
                    <img 
                      src={stories.find(s => s.id === showCommentBox)?.userPic || user.pic}
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                      Comments - {stories.find(s => s.id === showCommentBox)?.userName}
                    </h3>
                    <button 
                      onClick={() => setShowCommentBox(null)}
                      className="ml-auto p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                </div>
                
                {/* Comments Display */}
                <div className="max-h-96 overflow-y-auto space-y-3 mb-4">
                  {(storyComments[showCommentBox] || []).map((comment, idx) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/10 bg-emerald-50 flex-shrink-0">
                        <img 
                          src={comment.userPic || "https://picsum.photos/seed/default/200/200"}
                          alt={comment.user}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{comment.user}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(comment.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {comment.text}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {/* Comment Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <button
                    onClick={() => {
                      if (commentText.trim()) {
                        const newComment = {
                          id: Math.random().toString(36).substr(2, 9),
                          user: user.name,
                          userPic: user.pic,
                          text: commentText.trim(),
                          timestamp: new Date().toISOString()
                        };
                        
                        // Update comments for this story
                        setStoryComments(prev => ({
                          ...prev,
                          [showCommentBox]: [...(prev[showCommentBox] || []), newComment]
                        }));
                        
                        // Update story with new comment count
                        setStories(prev => prev.map(s => 
                          s.id === showCommentBox 
                            ? { ...s, comments: [...(s.comments || []), newComment] }
                            : s
                        ));
                        
                        // Send to server
                        propSocket?.emit('story_comment', {
                          storyId: showCommentBox,
                          comment: newComment
                        });
                        
                        setCommentText('');
                      }
                    }}
                    className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm hover:bg-emerald-600 transition-colors"
                  >
                    Post Comment
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Watch Together Modal */}
        <AnimatePresence>
          {isWatchTogetherOpen && watchTogetherReel && (
            <WatchTogether
              reel={watchTogetherReel}
              isOpen={isWatchTogetherOpen}
              onClose={closeWatchTogether}
              isDarkMode={isDarkMode}
              participants={watchTogetherParticipants}
              currentUser={user}
              socket={propSocket}
            />
          )}
        </AnimatePresence>

        {/* AI Suggestions Modal */}
        <AnimatePresence>
          {isAISuggestionsOpen && (
            <AISuggestions
              isOpen={isAISuggestionsOpen}
              onClose={closeAISuggestions}
              isDarkMode={isDarkMode}
              messages={messages}
              reels={reels}
              currentUser={user}
              onShareReel={handleShareFromAI}
              onWatchTogether={handleWatchTogetherFromAI}
            />
          )}
        </AnimatePresence>

        {/* Repost to Story Modal */}
        <AnimatePresence>
          {showRepostModal && repostReel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "w-full max-w-md rounded-3xl overflow-hidden shadow-2xl",
                  isDarkMode
                    ? "bg-slate-900 border border-slate-800"
                    : "bg-white border border-slate-200"
                )}
              >
                {/* Header */}
                <div className={cn(
                  "p-6 border-b flex items-center justify-between",
                  isDarkMode ? "border-slate-800" : "border-slate-200"
                )}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className={cn(
                        "font-bold text-lg",
                        isDarkMode ? "text-white" : "text-slate-900"
                      )}>
                        Repost to Story
                      </h3>
                      <p className={cn(
                        "text-xs",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        Share this reel with your followers
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeRepostModal}
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isDarkMode
                        ? "bg-slate-800 text-slate-400 hover:text-white"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Preview */}
                <div className="p-6">
                  <div className="rounded-2xl overflow-hidden mb-4 max-h-[200px]">
                    {repostReel.mediaType === 'video' ? (
                      <video
                        src={repostReel.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={repostReel.mediaUrl}
                        alt={repostReel.caption}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Caption input */}
                  <label className={cn(
                    "block text-xs font-bold uppercase tracking-wider mb-2",
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  )}>
                    Add a caption (optional)
                  </label>
                  <textarea
                    value={repostCaption}
                    onChange={(e) => setRepostCaption(e.target.value)}
                    placeholder="Write something about this reel..."
                    rows={3}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl outline-none border resize-none transition-colors",
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-purple-400"
                    )}
                  />

                  {/* Creator credit */}
                  <div className={cn(
                    "mt-4 p-3 rounded-xl flex items-center gap-3",
                    isDarkMode ? "bg-slate-800/50" : "bg-slate-100"
                  )}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {repostReel.createdByName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-xs font-bold",
                        isDarkMode ? "text-slate-300" : "text-slate-700"
                      )}>
                        Originally by {repostReel.createdByName}
                      </p>
                      <p className={cn(
                        "text-[10px]",
                        isDarkMode ? "text-slate-500" : "text-slate-400"
                      )}>
                        They will be credited in your story
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className={cn(
                  "p-6 border-t flex gap-3",
                  isDarkMode ? "border-slate-800" : "border-slate-200"
                )}>
                  <button
                    onClick={closeRepostModal}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold transition-colors",
                      isDarkMode
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRepostToStory}
                    className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Repost to Story
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Profile Modal */}
        <UserProfileModal
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          user={user || null}
          targetUser={selectedUserProfile}
          reels={reels}
          isDarkMode={isDarkMode}
          onReelClick={(reel) => {
            setViewingReel(reel);
            setShowUserProfile(false);
          }}
        />

        {/* AI Tools Modal - Explain & Translate */}
        <AnimatePresence>
          {showAiToolsModal && selectedMessageForAi && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAiToolsModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "w-full max-w-md rounded-3xl shadow-2xl overflow-hidden",
                  isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"
                )}
              >
                {/* Header */}
                <div className={cn(
                  "p-5 border-b flex items-center justify-between",
                  isDarkMode ? "border-slate-800" : "border-slate-200"
                )}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className={cn(
                        "font-bold text-lg",
                        isDarkMode ? "text-white" : "text-slate-900"
                      )}>
                        AI Tools
                      </h3>
                      <p className={cn(
                        "text-xs",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        Explain or translate this message
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAiToolsModal(false)}
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isDarkMode
                        ? "bg-slate-800 text-slate-400 hover:text-white"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Original Message Preview */}
                <div className={cn(
                  "mx-5 mt-4 p-4 rounded-2xl",
                  isDarkMode ? "bg-slate-800/50" : "bg-slate-100"
                )}>
                  <p className={cn(
                    "text-xs font-bold uppercase tracking-wider mb-2",
                    isDarkMode ? "text-slate-500" : "text-slate-400"
                  )}>
                    Original Message
                  </p>
                  <p className={cn(
                    "text-sm",
                    isDarkMode ? "text-slate-200" : "text-slate-700"
                  )}>
                    {selectedMessageForAi.text}
                  </p>
                </div>

                {/* Tabs */}
                <div className="px-5 py-4">
                  <div className={cn(
                    "flex rounded-xl p-1",
                    isDarkMode ? "bg-slate-800" : "bg-slate-100"
                  )}>
                    <button
                      onClick={() => {
                        setAiToolActiveTab('explain');
                        setAiToolResult('');
                      }}
                      className={cn(
                        "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                        aiToolActiveTab === 'explain'
                          ? (isDarkMode
                              ? "bg-slate-700 text-white shadow-lg"
                              : "bg-white text-slate-900 shadow-sm")
                          : (isDarkMode
                              ? "text-slate-400 hover:text-slate-200"
                              : "text-slate-500 hover:text-slate-700")
                      )}
                    >
                      <Sparkles className="w-4 h-4" />
                      AI Explain
                    </button>
                    <button
                      onClick={() => {
                        setAiToolActiveTab('translate');
                        setAiToolResult('');
                      }}
                      className={cn(
                        "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                        aiToolActiveTab === 'translate'
                          ? (isDarkMode
                              ? "bg-slate-700 text-white shadow-lg"
                              : "bg-white text-slate-900 shadow-sm")
                          : (isDarkMode
                              ? "text-slate-400 hover:text-slate-200"
                              : "text-slate-500 hover:text-slate-700")
                      )}
                    >
                      <Languages className="w-4 h-4" />
                      Translate
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="px-5 pb-4">
                  {aiToolActiveTab === 'translate' && (
                    <div className="mb-4">
                      <label className={cn(
                        "block text-xs font-bold uppercase tracking-wider mb-2",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        Select Language
                      </label>
                      <select
                        value={msgTranslateTargetLang}
                        onChange={(e) => setMsgTranslateTargetLang(e.target.value)}
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl text-sm outline-none border transition-colors",
                          isDarkMode
                            ? "bg-slate-800 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-900"
                        )}
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={async () => {
                      setAiToolLoading(true);
                      if (aiToolActiveTab === 'explain') {
                        await explainMessageWithAI(selectedMessageForAi.id!, selectedMessageForAi.text!);
                        // Get the explanation result from the updated message
                        const updatedMsg = messages.find(m => m.id === selectedMessageForAi.id);
                        setAiToolResult(updatedMsg?.explainedText || '');
                      } else {
                        await translateMessage(selectedMessageForAi.id!, selectedMessageForAi.text!, msgTranslateTargetLang);
                        // Get the translation result from the updated message
                        const updatedMsg = messages.find(m => m.id === selectedMessageForAi.id);
                        setAiToolResult(updatedMsg?.translatedText || '');
                      }
                      setAiToolLoading(false);
                    }}
                    disabled={aiToolLoading}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                      aiToolLoading
                        ? "opacity-70 cursor-not-allowed"
                        : "hover:opacity-90",
                      aiToolActiveTab === 'explain'
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                        : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                    )}
                  >
                    {aiToolLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {aiToolActiveTab === 'explain' ? 'Explaining...' : 'Translating...'}
                      </>
                    ) : (
                      <>
                        {aiToolActiveTab === 'explain' ? (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Explain with AI
                          </>
                        ) : (
                          <>
                            <Languages className="w-4 h-4" />
                            Translate Message
                          </>
                        )}
                      </>
                    )}
                  </button>

                  {/* Result Display */}
                  {aiToolResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "mt-4 p-4 rounded-2xl border",
                        aiToolActiveTab === 'explain'
                          ? (isDarkMode
                              ? "bg-emerald-900/20 border-emerald-500/30"
                              : "bg-emerald-50 border-emerald-200")
                          : (isDarkMode
                              ? "bg-blue-900/20 border-blue-500/30"
                              : "bg-blue-50 border-blue-200")
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {aiToolActiveTab === 'explain' ? (
                          <Sparkles className={cn(
                            "w-4 h-4",
                            isDarkMode ? "text-emerald-400" : "text-emerald-600"
                          )} />
                        ) : (
                          <Languages className={cn(
                            "w-4 h-4",
                            isDarkMode ? "text-blue-400" : "text-blue-600"
                          )} />
                        )}
                        <span className={cn(
                          "text-xs font-bold uppercase tracking-wider",
                          aiToolActiveTab === 'explain'
                            ? (isDarkMode ? "text-emerald-400" : "text-emerald-600")
                            : (isDarkMode ? "text-blue-400" : "text-blue-600")
                        )}>
                          {aiToolActiveTab === 'explain' ? 'AI Explanation' : `Translated (${SUPPORTED_LANGUAGES.find(l => l.code === msgTranslateTargetLang)?.name || 'Translated'})`}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm font-medium",
                        isDarkMode ? "text-slate-200" : "text-slate-700"
                      )}>
                        {aiToolResult}
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ChatPage;