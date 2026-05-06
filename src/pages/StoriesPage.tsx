import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import type { User as UserType, Story, StoryViewer, StoryReaction, StoryReply } from '../types';
import Navbar from '../components/Navbar';
import {
  Heart,
  MessageCircle,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Sparkles,
  Users,
  TrendingUp,
  Eye,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Camera,
  Video,
  Music,
  Bookmark,
  Share2,
  MoreHorizontal,
  Smile,
  Send,
  EyeOff,
  UserPlus,
  Archive,
  ArchiveRestore,
  Crown,
  Flame,
  Clock,
  BarChart3,
  Flag,
  MoreVertical,
  GripVertical,
  Zap,
  Star,
  Hash,
  Grip,
  Maximize2,
  Minimize2,
  Reply,
  AtSign,
  MessageSquare,
  Copy,
  User,
  BadgeCheck,
  Languages,
  Sticker,
  Wand2,
  BrainCircuit,
  Lightbulb,
  Type,
  FileText,
  Loader2,
  RefreshCw,
  Globe,
  CheckCircle2,
  Palette,
  Sun,
  Moon,
  Menu,
  Search,
  Music2,
  AudioLines,
  Check,
} from 'lucide-react';

interface StoriesPageProps {
  isDarkMode?: boolean;
  user?: UserType;
  socket?: any;
  setUser?: (user: UserType | null) => void;
  toggleDarkMode?: () => void;
  socketConnected?: boolean;
}

// Emoji reactions for stories
const STORY_REACTIONS = ['❤️', '🔥', '😂', '😮', '👏', '🎉', '💯', '😍'];

const StoriesPage = ({ isDarkMode, user, socket, setUser, toggleDarkMode, socketConnected }: StoriesPageProps) => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [archivedStories, setArchivedStories] = useState<Story[]>([]);
  const [highlightedStories, setHighlightedStories] = useState<Story[]>([]);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('mutedStoryUsers');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [closeFriends, setCloseFriends] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('closeFriends');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Story Viewer States
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  // Progress and Auto-play States
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const STORY_DURATION = 5000; // 5 seconds per story

  // Reply and Reaction States
  const [replyText, setReplyText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [storyReactions, setStoryReactions] = useState<{ [key: string]: StoryReaction[] }>({});
  const [storyReplies, setStoryReplies] = useState<{ [key: string]: StoryReply[] }>({});

  // Viewers Modal
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [storyViewers, setStoryViewers] = useState<StoryViewer[]>([]);

  // UI States
  const [viewedStories, setViewedStories] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('viewedStories');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'friends' | 'closeFriends' | 'archived' | 'highlights'>('all');
  const [showUserMenu, setShowUserMenu] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // NEW: Loading state for skeleton loaders
  const [isLoading, setIsLoading] = useState(true);

  // NEW: AI Features states
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [aiCaption, setAiCaption] = useState('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [smartHashtags, setSmartHashtags] = useState<string[]>([]);
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const [showHashtagModal, setShowHashtagModal] = useState(false);
  const [activeHashtags, setActiveHashtags] = useState<string[]>([]);

  // NEW: Auto stickers state
  const [autoStickers, setAutoStickers] = useState<{[storyId: string]: string[]}>({});
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [selectedStoryForStickers, setSelectedStoryForStickers] = useState<string | null>(null);
  const availableStickers = ['🔥', '✨', '🎉', '💯', '😍', '🤩', '🚀', '💪', '🎯', '⭐', '🌟', '💖', '🎊', '👏', '⚡', '🎵', '📸', '🎬', '🌈', '🎭'];

  // Story-Chat Integration States
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showShareToChatModal, setShowShareToChatModal] = useState(false);
  const [showMentionModal, setShowMentionModal] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [showSayHiButton, setShowSayHiButton] = useState(false);
  const [justViewedStory, setJustViewedStory] = useState<Story | null>(null);
  const [storyMentions, setStoryMentions] = useState<{[storyId: string]: string[]}>({});
  const [friendsList, setFriendsList] = useState<UserType[]>([]);
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [shareActiveTab, setShareActiveTab] = useState<'friends' | 'groups'>('friends');
  const [selectedShareTargets, setSelectedShareTargets] = useState<string[]>([]);

  // NEW: Translation states
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translatedText, setTranslatedText] = useState<{[storyId: string]: string}>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
  ];

  // NEW: Story summary states
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [storySummary, setStorySummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // NEW: Floating button visibility
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // NEW: Viewer dark mode toggle
  const [viewerDarkMode, setViewerDarkMode] = useState(isDarkMode);

  // NEW: Story audio playback state
  const [storyAudioPlaying, setStoryAudioPlaying] = useState(false);
  const storyAudioRef = useRef<HTMLAudioElement>(null);

  // Toggle story audio playback
  const toggleStoryAudio = () => {
    if (!activeStory?.audioUrl) return;
    
    if (storyAudioRef.current) {
      if (storyAudioPlaying) {
        storyAudioRef.current.pause();
      } else {
        storyAudioRef.current.play();
      }
      setStoryAudioPlaying(!storyAudioPlaying);
    }
  };

  // NEW: Search query
  const [searchQuery, setSearchQuery] = useState('');

  // NEW: Story audio/song states
  const [newStoryAudioUrl, setNewStoryAudioUrl] = useState('');
  const [showAudioPicker, setShowAudioPicker] = useState(false);
  const [pendingStoryFile, setPendingStoryFile] = useState<File | null>(null);

  // NEW: Touch swipe states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  // Handle touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    handleHoldStart();
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    handleHoldEnd();
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNextStory();
    }
    if (isRightSwipe) {
      handlePrevStory();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Group stories by user - stable ref to avoid circular deps
  const groupedStoriesRef = useRef<() => { [key: string]: Story[] }>(() => ({}));
  useEffect(() => {
    groupedStoriesRef.current = () => {
      const groups: { [key: string]: Story[] } = {};
      stories.filter(s => !s.isArchived && !mutedUsers.has(s.userName)).forEach(story => {
        if (!groups[story.userName]) {
          groups[story.userName] = [];
        }
        groups[story.userName].push(story);
      });
      return groups;
    };
  }, [stories, mutedUsers]);

  // Calculate new stories count
  const newStoriesCount = stories.filter(story =>
    story.userName !== user?.name && !viewedStories.has(story.id) && !story.isArchived && !mutedUsers.has(story.userName)
  ).length;

  // Authentication check
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!user && !storedUser) {
      const redirectTimer = setTimeout(() => {
        if (!user && !localStorage.getItem('user')) {
          navigate('/login', { replace: true });
        }
      }, 500);
      return () => clearTimeout(redirectTimer);
    }
  }, [navigate, user]);

  // Socket setup and listeners
  useEffect(() => {
    if (!socket) return;

    // Emit setup when component mounts to maintain online status (server expects 'setup' event)
    if (socket && user && user._id) {
      socket.emit('setup', { _id: user._id, name: user.name, pic: user.pic, email: user.email });
      console.log('📡 StoriesPage: Emitted setup for', user.name);
    }

    // Listen for profile picture updates from other users
    const handleProfileUpdate = (data: { userId: string, userName: string, profilePic: string }) => {
      console.log(`👤 StoriesPage: Received profile update for ${data.userName}`);

      // Update stories from this user
      setStories(prev => prev.map(story =>
        story.userId === data.userId || story.userName === data.userName
          ? { ...story, userPic: data.profilePic }
          : story
      ));

      // Update archived stories from this user
      setArchivedStories(prev => prev.map(story =>
        story.userId === data.userId || story.userName === data.userName
          ? { ...story, userPic: data.profilePic }
          : story
      ));

      // Update highlighted stories from this user
      setHighlightedStories(prev => prev.map(story =>
        story.userId === data.userId || story.userName === data.userName
          ? { ...story, userPic: data.profilePic }
          : story
      ));

      // Update viewers list if any viewer updated their profile
      setStories(prev => prev.map(story => ({
        ...story,
        viewers: story.viewers?.map(viewer =>
          viewer.userId === data.userId || viewer.userName === data.userName
            ? { ...viewer, userPic: data.profilePic }
            : viewer
        )
      })));
    };

    socket.on('user_profile_updated', handleProfileUpdate);

    return () => {
      socket.off('user_profile_updated', handleProfileUpdate);
    };
  }, [socket]);

  // Listen for online status updates from server
  useEffect(() => {
    if (!socket) return;

    socket.on('user_status_change', (updatedUsers: any[]) => {
      console.log('📥 StoriesPage: Received user_status_change', updatedUsers);
      // Update online users list
      const onlineUserIds = new Set(updatedUsers.filter(u => u.isOnline).map(u => u._id));
    });

    return () => {
      socket.off('user_status_change');
    };
  }, [socket, user]);

  // NEW: Scroll handler for floating button
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowFloatingButton(false);
      } else {
        setShowFloatingButton(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Handle story file selection - opens audio picker after selecting media
  const handleStoryFileSelect = (file: File) => {
    setPendingStoryFile(file);
    setShowAudioPicker(true);
  };

  // Confirm and add story with selected audio
  const confirmAddStory = () => {
    if (pendingStoryFile) {
      addStory(pendingStoryFile, newStoryAudioUrl);
      setShowAudioPicker(false);
    }
  };

  // NEW: AI Caption Generator - Using GROQ API
  const generateAICaption = async () => {
    setIsGeneratingCaption(true);
    try {
      const response = await fetch('/api/stories/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: activeStory?.caption || '' })
      });
      const data = await response.json();
      if (data.caption) {
        setAiCaption(data.caption);
      } else {
        throw new Error('No caption generated');
      }
    } catch (error) {
      console.error('AI caption generation error:', error);
      alert('Failed to generate AI caption. Please check your API configuration.');
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  // NEW: Smart Hashtags Generator - Using GROQ API
  const generateSmartHashtags = async () => {
    setIsGeneratingHashtags(true);
    try {
      const captionToUse = activeStory?.caption || 'Story content';
      const response = await fetch('/api/stories/ai/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: captionToUse })
      });
      const data = await response.json();
      if (data.hashtags && data.hashtags.length > 0) {
        setSmartHashtags(data.hashtags);
      } else {
        throw new Error('No hashtags generated');
      }
    } catch (error) {
      console.error('AI hashtags generation error:', error);
      alert('Failed to generate hashtags. Please check your API configuration.');
    } finally {
      setIsGeneratingHashtags(false);
    }
  };

  // NEW: Generate Story Summary - Using GROQ API
  const generateStorySummary = async (story: Story) => {
    if (!story) return;
    setIsGeneratingSummary(true);
    try {
      const response = await fetch('/api/stories/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: story.caption || 'Story content' })
      });
      const data = await response.json();
      if (data.summary) {
        setStorySummary(data.summary);
      } else {
        throw new Error('No summary generated');
      }
    } catch (error) {
      console.error('AI summary generation error:', error);
      alert('Failed to generate summary. Please check your API configuration.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // NEW: Translate Story - Using GROQ API
  const translateStory = async (story: Story, targetLang: string) => {
    if (!story?.caption) return;
    setIsTranslating(true);
    try {
      const response = await fetch('/api/stories/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: story.caption,
          targetLanguage: targetLang
        })
      });
      const data = await response.json();
      if (data.translation) {
        setTranslatedText(prev => ({ ...prev, [story.id]: data.translation }));
      } else {
        throw new Error('No translation generated');
      }
    } catch (error) {
      console.error('AI translation error:', error);
      alert('Failed to translate. Please check your API configuration.');
    } finally {
      setIsTranslating(false);
    }
  };

  // NEW: Apply AI Caption
  const applyAICaption = (storyId: string) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, caption: aiCaption } : s));
    setAiCaption('');
    setShowAICaptionModal(false);
  };

  // NEW: Apply Hashtags
  const applyHashtags = (storyId: string) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, hashtags: smartHashtags } : s));
    setSmartHashtags([]);
    setShowHashtagModal(false);
  };

  // NEW: Add Auto Sticker
  const addAutoSticker = (storyId: string, sticker: string) => {
    setAutoStickers(prev => ({
      ...prev,
      [storyId]: [...(prev[storyId] || []), sticker]
    }));
  };

  // NEW: Remove Sticker
  const removeSticker = (storyId: string, index: number) => {
    setAutoStickers(prev => ({
      ...prev,
      [storyId]: prev[storyId]?.filter((_, i) => i !== index) || []
    }));
  };

  // Load stories from localStorage
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const savedStories = localStorage.getItem('userStories');
        const savedArchived = localStorage.getItem('archivedStories');
        const savedHighlights = localStorage.getItem('highlightedStories');

        let userStories: Story[] = [];
        let archived: Story[] = [];
        let highlights: Story[] = [];

        if (savedStories) {
          try {
            userStories = JSON.parse(savedStories);
          } catch (e) {
            console.error("Error parsing saved stories:", e);
          }
        }

        if (savedArchived) {
          try {
            archived = JSON.parse(savedArchived);
          } catch (e) {
            console.error("Error parsing archived stories:", e);
          }
        }

        if (savedHighlights) {
          try {
            highlights = JSON.parse(savedHighlights);
          } catch (e) {
            console.error("Error parsing highlighted stories:", e);
          }
        }

        // If no saved stories, use enhanced mock data
        if (userStories.length === 0 && user) {
          userStories = generateMockStories();
        }

        setStories(userStories);
        setArchivedStories(archived);
        setHighlightedStories(highlights);
      } catch (error) {
        console.error('Error fetching stories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, [user]);

  // Generate enhanced mock stories
  const generateMockStories = (): Story[] => {
    const mockUsers = [
      { name: 'Alex Johnson', pic: 'https://picsum.photos/seed/alex/200/200' },
      { name: 'Sarah Chen', pic: 'https://picsum.photos/seed/sarah/200/200' },
      { name: 'Mike Ross', pic: 'https://picsum.photos/seed/mike/200/200' },
      { name: 'Emma Wilson', pic: 'https://picsum.photos/seed/emma/200/200' },
      { name: 'David Kim', pic: 'https://picsum.photos/seed/david/200/200' },
    ];

    const stories: Story[] = [];
    let idCounter = 1;

    mockUsers.forEach((mockUser, userIdx) => {
      // Each user has 2-4 stories
      const storyCount = 2 + Math.floor(Math.random() * 3);
      const storyGroupId = `group_${userIdx}`;

      for (let i = 0; i < storyCount; i++) {
        const isCloseFriend = userIdx < 2;
        const hasReactions = Math.random() > 0.5;
        const hasViewers = Math.random() > 0.3;
        const isVerified = userIdx === 0 || userIdx === 2; // First and third user are verified
        const isTrending = userIdx === 0 && i === 0; // First story of first user is trending
        const views = 50 + Math.floor(Math.random() * 500);
        const trendingScore = isTrending ? 100 + Math.floor(Math.random() * 200) : views;

        stories.push({
          id: `${idCounter++}`,
          userName: mockUser.name,
          userPic: mockUser.pic,
          userId: `user_${userIdx}`,
          mediaUrl: `https://picsum.photos/seed/story${idCounter}/600/800`,
          mediaType: Math.random() > 0.7 ? 'video' : 'image',
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          duration: 5000,
          liked: false,
          likes: [],
          comments: [],
          storyGroupId,
          isCloseFriend,
          isArchived: false,
          isMuted: false,
          isHighlight: false,
          reactions: hasReactions ? generateMockReactions() : [],
          viewers: hasViewers ? generateMockViewers() : [],
          replies: [],
          // NEW: Enhanced features
          isVerified,
          isTrending,
          views,
          trendingScore,
          shares: Math.floor(Math.random() * 50),
          caption: `Amazing moment captured! 🌟 #story${idCounter}`,
          hashtags: ['#photography', '#moments', '#lifestyle'],
          aiGenerated: false,
        });
      }
    });

    // Add current user stories
    const currentUserStories = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < currentUserStories; i++) {
      stories.push({
        id: `${idCounter++}`,
        userName: user?.name || 'You',
        userPic: user?.pic || 'https://picsum.photos/seed/you/200/200',
        userId: 'current_user',
        mediaUrl: `https://picsum.photos/seed/yourstory${i}/600/800`,
        mediaType: 'image',
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        duration: 5000,
        liked: false,
        likes: [],
        comments: [],
        storyGroupId: 'your_stories',
        isCloseFriend: false,
        isArchived: false,
        isMuted: false,
        isHighlight: i === 0,
        highlightTitle: i === 0 ? 'Best Moments' : undefined,
        reactions: [],
        viewers: generateMockViewers(),
        replies: [],
        // NEW: Enhanced features
        isVerified: true,
        isTrending: i === 0,
        views: 100 + Math.floor(Math.random() * 300),
        trendingScore: i === 0 ? 200 : 50,
        shares: Math.floor(Math.random() * 30),
        caption: `My story #${i + 1} - Living my best life! ✨`,
        hashtags: ['#me', '#lifestyle', '#trending'],
        aiGenerated: false,
      });
    }

    return stories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const generateMockReactions = (): StoryReaction[] => {
    const reactions: StoryReaction[] = [];
    const count = 1 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      reactions.push({
        emoji: STORY_REACTIONS[Math.floor(Math.random() * STORY_REACTIONS.length)],
        userId: `user_${i}`,
        userName: `User ${i}`,
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      });
    }
    return reactions;
  };

  const generateMockViewers = (): StoryViewer[] => {
    const viewers: StoryViewer[] = [];
    const count = 3 + Math.floor(Math.random() * 15);
    const mockNames = ['Alex', 'Sarah', 'Mike', 'Emma', 'David', 'Lisa', 'Tom', 'Jenny', 'Chris', 'Anna'];
    for (let i = 0; i < count; i++) {
      viewers.push({
        userId: `viewer_${i}`,
        userName: mockNames[i % mockNames.length],
        userPic: `https://picsum.photos/seed/viewer${i}/200/200`,
        viewedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      });
    }
    return viewers;
  };

  // Save stories to localStorage
  useEffect(() => {
    if (stories.length > 0) {
      localStorage.setItem('userStories', JSON.stringify(stories));
    }
  }, [stories]);

  useEffect(() => {
    localStorage.setItem('archivedStories', JSON.stringify(archivedStories));
  }, [archivedStories]);

  useEffect(() => {
    localStorage.setItem('highlightedStories', JSON.stringify(highlightedStories));
  }, [highlightedStories]);

  useEffect(() => {
    localStorage.setItem('mutedStoryUsers', JSON.stringify([...mutedUsers]));
  }, [mutedUsers]);

  useEffect(() => {
    localStorage.setItem('closeFriends', JSON.stringify([...closeFriends]));
  }, [closeFriends]);

  useEffect(() => {
    localStorage.setItem('viewedStories', JSON.stringify([...viewedStories]));
  }, [viewedStories]);

  // Ref for handleNextStory to avoid circular deps and ordering issues
  const handleNextStoryRef = useRef<() => void>(() => {});

  // Progress bar animation
  useEffect(() => {
    if (showStoryViewer && activeStory && !isPaused && isAutoPlayEnabled) {
      setProgress(0);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = (elapsed / STORY_DURATION) * 100;

        if (newProgress >= 100) {
          setProgress(100);
          handleNextStoryRef.current();
        } else {
          setProgress(newProgress);
        }
      }, 50);

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, [showStoryViewer, activeStory, isPaused, activeStoryIndex, activeGroupIndex, isAutoPlayEnabled]);

  // Handle story navigation
  const handleNextStory = useCallback(() => {
    if (!activeStory) return;

    const groups = groupedStoriesRef.current();
    const groupKeys = Object.keys(groups);
    const currentGroup = groupKeys[activeGroupIndex];
    const currentGroupStories = groups[currentGroup] || [];

    if (activeStoryIndex < currentGroupStories.length - 1) {
      // Next story in same group
      setActiveStoryIndex(prev => prev + 1);
      setActiveStory(currentGroupStories[activeStoryIndex + 1]);
      setProgress(0);
    } else if (activeGroupIndex < groupKeys.length - 1) {
      // Move to next group
      setActiveGroupIndex(prev => prev + 1);
      setActiveStoryIndex(0);
      const nextGroup = groupKeys[activeGroupIndex + 1];
      setActiveStory(groups[nextGroup]?.[0] || null);
      setProgress(0);
    } else {
      // End of all stories
      setShowStoryViewer(false);
      setActiveStory(null);
    }
  }, [activeStory, activeStoryIndex, activeGroupIndex]);

  // Update ref when handleNextStory changes
  useEffect(() => {
    handleNextStoryRef.current = handleNextStory;
  }, [handleNextStory]);

  const handlePrevStory = useCallback(() => {
    if (!activeStory) return;

    const groups = groupedStoriesRef.current();
    const groupKeys = Object.keys(groups);

    if (activeStoryIndex > 0) {
      // Previous story in same group
      setActiveStoryIndex(prev => prev - 1);
      const currentGroup = groupKeys[activeGroupIndex];
      setActiveStory(groups[currentGroup]?.[activeStoryIndex - 1] || null);
      setProgress(0);
    } else if (activeGroupIndex > 0) {
      // Move to previous group's last story
      setActiveGroupIndex(prev => prev - 1);
      const prevGroup = groupKeys[activeGroupIndex - 1];
      const prevGroupStories = groups[prevGroup] || [];
      setActiveStoryIndex(prevGroupStories.length - 1);
      setActiveStory(prevGroupStories[prevGroupStories.length - 1] || null);
      setProgress(0);
    }
  }, [activeStory, activeStoryIndex, activeGroupIndex]);

  // Pause on hold
  const handleHoldStart = useCallback(() => {
    setIsPaused(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  const handleHoldEnd = useCallback(() => {
    setIsPaused(false);
    if (videoRef.current && activeStory?.mediaType === 'video') {
      videoRef.current.play();
    }
  }, [activeStory]);

  // Add story with optional audio
  const addStory = (file: File, audioUrl?: string) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newStory: Story = {
        id: Math.random().toString(36).substr(2, 9),
        userName: user?.name || 'You',
        userPic: user?.pic || 'https://picsum.photos/seed/you/200/200',
        userId: 'current_user',
        mediaUrl: reader.result as string,
        mediaType: file.type.startsWith('image/') ? 'image' : 'video',
        timestamp: new Date().toISOString(),
        duration: 5000,
        liked: false,
        likes: [],
        comments: [],
        reactions: [],
        viewers: [],
        replies: [],
        storyGroupId: `your_stories_${Date.now()}`,
        isArchived: false,
        isMuted: false,
        isHighlight: false,
        audioUrl: audioUrl || undefined,
      };
      setStories(prev => [newStory, ...prev]);
      // Reset audio after adding story
      setNewStoryAudioUrl('');
      setPendingStoryFile(null);
    };
    reader.readAsDataURL(file);
  };

  // Add audio to story
  const addAudioToStory = (audioFile: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewStoryAudioUrl(reader.result as string);
    };
    reader.readAsDataURL(audioFile);
  };

  // Add reaction to story
  const addReaction = (storyId: string, emoji: string) => {
    const newReaction: StoryReaction = {
      emoji,
      userId: user?._id || 'current_user',
      userName: user?.name || 'You',
      timestamp: new Date().toISOString(),
    };

    setStories(prev => prev.map(story => {
      if (story.id === storyId) {
        return {
          ...story,
          reactions: [...(story.reactions || []), newReaction],
        };
      }
      return story;
    }));

    setStoryReactions(prev => ({
      ...prev,
      [storyId]: [...(prev[storyId] || []), newReaction],
    }));

    socket?.emit('story_reaction', { storyId, reaction: newReaction });
  };

  // Add reply to story
  const addReply = (storyId: string, text: string) => {
    if (!text.trim()) return;

    const newReply: StoryReply = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user?._id || 'current_user',
      userName: user?.name || 'You',
      userPic: user?.pic || 'https://picsum.photos/seed/you/200/200',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setStories(prev => prev.map(story => {
      if (story.id === storyId) {
        return {
          ...story,
          replies: [...(story.replies || []), newReply],
        };
      }
      return story;
    }));

    setStoryReplies(prev => ({
      ...prev,
      [storyId]: [...(prev[storyId] || []), newReply],
    }));

    setReplyText('');
    socket?.emit('story_reply', { storyId, reply: newReply });
  };

  // Add viewer to story
  const addViewer = (storyId: string) => {
    const newViewer: StoryViewer = {
      userId: user?._id || 'current_user',
      userName: user?.name || 'You',
      userPic: user?.pic || 'https://picsum.photos/seed/you/200/200',
      viewedAt: new Date().toISOString(),
    };

    setStories(prev => prev.map(story => {
      if (story.id === storyId) {
        const existingViewers = story.viewers || [];
        if (!existingViewers.find(v => v.userId === newViewer.userId)) {
          return {
            ...story,
            viewers: [...existingViewers, newViewer],
          };
        }
      }
      return story;
    }));
  };

  // Archive story
  const archiveStory = (storyId: string) => {
    const storyToArchive = stories.find(s => s.id === storyId);
    if (storyToArchive) {
      setStories(prev => prev.filter(s => s.id !== storyId));
      setArchivedStories(prev => [{ ...storyToArchive, isArchived: true }, ...prev]);
    }
  };

  // Unarchive story
  const unarchiveStory = (storyId: string) => {
    const storyToUnarchive = archivedStories.find(s => s.id === storyId);
    if (storyToUnarchive) {
      setArchivedStories(prev => prev.filter(s => s.id !== storyId));
      setStories(prev => [{ ...storyToUnarchive, isArchived: false }, ...prev]);
    }
  };

  // Delete story
  const deleteStory = (storyId: string) => {
    setStories(prev => prev.filter(s => s.id !== storyId));
    setArchivedStories(prev => prev.filter(s => s.id !== storyId));
    setHighlightedStories(prev => prev.filter(s => s.id !== storyId));
    if (activeStory?.id === storyId) {
      setShowStoryViewer(false);
      setActiveStory(null);
    }
  };

  // Mute/Unmute user stories
  const toggleMuteUser = (userName: string) => {
    setMutedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userName)) {
        newSet.delete(userName);
      } else {
        newSet.add(userName);
      }
      return newSet;
    });
    setShowUserMenu(null);
  };

  // Add/Remove close friend
  const toggleCloseFriend = (userName: string) => {
    setCloseFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userName)) {
        newSet.delete(userName);
      } else {
        newSet.add(userName);
      }
      return newSet;
    });
    setStories(prev => prev.map(story => {
      if (story.userName === userName) {
        return { ...story, isCloseFriend: !story.isCloseFriend };
      }
      return story;
    }));
    setShowUserMenu(null);
  };

  // Add to highlights
  const addToHighlights = (storyId: string, title?: string) => {
    setStories(prev => prev.map(story => {
      if (story.id === storyId) {
        return { ...story, isHighlight: true, highlightTitle: title || 'Highlight' };
      }
      return story;
    }));
    const story = stories.find(s => s.id === storyId);
    if (story) {
      setHighlightedStories(prev => [{ ...story, isHighlight: true, highlightTitle: title || 'Highlight' }, ...prev]);
    }
  };

  // Open story viewer
  const openStoryViewer = (story: Story, groupIndex: number, storyIndex: number) => {
    setActiveStory(story);
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(storyIndex);
    setShowStoryViewer(true);
    setProgress(0);
    setViewedStories(prev => new Set(prev).add(story.id));
    addViewer(story.id);
  };

  // Get filtered stories for display
  const getDisplayStories = () => {
    let displayStories = stories;

    if (selectedCategory === 'closeFriends') {
      displayStories = stories.filter(s => closeFriends.has(s.userName) || s.isCloseFriend);
    } else if (selectedCategory === 'friends') {
      // Show only friends' stories (exclude current user's own stories)
      displayStories = stories.filter(s => s.userName !== user?.name && !s.isArchived);
    } else if (selectedCategory === 'archived') {
      displayStories = archivedStories;
    } else if (selectedCategory === 'highlights') {
      displayStories = highlightedStories;
    }

    return displayStories.filter(s => !s.isArchived || selectedCategory === 'archived');
  };

  // ============================================
  // STORY-CHAT INTEGRATION FUNCTIONS
  // ============================================

  // 1. Reply to Story → Opens Chat
  const replyToStory = () => {
    if (!activeStory || !replyText.trim()) return;
    
    // Save reply data to localStorage for ChatPage to pick up
    const replyData = {
      storyId: activeStory.id,
      storyUser: activeStory.userName,
      storyUserPic: activeStory.userPic,
      storyMedia: activeStory.mediaUrl,
      storyMediaType: activeStory.mediaType,
      replyText: replyText.trim(),
      timestamp: new Date().toISOString(),
      type: 'story_reply'
    };
    localStorage.setItem('pendingStoryReply', JSON.stringify(replyData));
    
    // Emit socket event for story reaction in chat
    socket?.emit('story_reaction_in_chat', {
      storyId: activeStory.id,
      storyUser: activeStory.userName,
      reaction: `Replied to story: ${replyText.trim()}`,
      reactedBy: user?.name,
      timestamp: new Date().toISOString()
    });
    
    // Navigate to chat with the story owner
    navigate('/chat', { state: { selectedUser: { name: activeStory.userName, pic: activeStory.userPic, _id: activeStory.userId } } });
    setShowReplyModal(false);
    setShowStoryViewer(false);
    setReplyText('');
  };

  // 2. Share Story to Chat - Updated to handle multiple friends and groups
  const shareStoryToChat = (targetIds: string[], targetType: 'friends' | 'groups') => {
    if (!activeStory || targetIds.length === 0) return;

    const sharedStories = JSON.parse(localStorage.getItem('sharedStories') || '[]');

    targetIds.forEach(targetId => {
      // Find target name
      let targetName = targetId;
      if (targetType === 'friends') {
        const friend = friendsList.find(f => f._id === targetId);
        if (friend) targetName = friend.name;
      } else {
        const group = groupsList.find(g => g._id === targetId);
        if (group) targetName = group.name;
      }

      const shareData = {
        type: 'story_share',
        storyId: activeStory.id,
        storyUser: activeStory.userName,
        storyUserPic: activeStory.userPic,
        storyMedia: activeStory.mediaUrl,
        storyMediaType: activeStory.mediaType,
        sharedTo: targetName,
        sharedToId: targetId,
        sharedToType: targetType,
        sharedBy: user?.name,
        timestamp: new Date().toISOString()
      };

      sharedStories.push(shareData);

      // Store pending share message for each target
      localStorage.setItem(`pendingStoryShare_${targetId}`, JSON.stringify(shareData));

      // Emit socket event
      socket?.emit('story_shared_in_chat', shareData);
    });

    // Store all shared stories
    localStorage.setItem('sharedStories', JSON.stringify(sharedStories));

    // Reset and close modal
    setSelectedShareTargets([]);
    setShowShareToChatModal(false);
    setShowStoryViewer(false);

    // Navigate to chat if only one friend selected, otherwise stay on stories
    if (targetType === 'friends' && targetIds.length === 1) {
      const friend = friendsList.find(f => f._id === targetIds[0]);
      if (friend) {
        navigate('/chat', { state: { selectedUser: { name: friend.name, _id: friend._id, pic: friend.pic } } });
      }
    } else if (targetType === 'groups' && targetIds.length === 1) {
      const group = groupsList.find(g => g._id === targetIds[0]);
      if (group) {
        navigate('/chat', { state: { selectedGroup: { _id: group._id, name: group.name, pic: group.pic } } });
      }
    }
  };

  // 3. Mention Friend in Story
  const handleMention = (friendName: string) => {
    if (!activeStory) return;
    
    const mentions = storyMentions[activeStory.id] || [];
    if (!mentions.includes(friendName)) {
      const newMentions = { ...storyMentions, [activeStory.id]: [...mentions, friendName] };
      setStoryMentions(newMentions);
      localStorage.setItem('storyMentions', JSON.stringify(newMentions));
      
      // Store mention notification
      const mentionData = {
        type: 'story_mention',
        storyId: activeStory.id,
        storyUser: activeStory.userName,
        storyMedia: activeStory.mediaUrl,
        mentionedUser: friendName,
        mentionedBy: user?.name,
        timestamp: new Date().toISOString()
      };
      
      const pendingMentions = JSON.parse(localStorage.getItem('pendingMentions') || '[]');
      pendingMentions.push(mentionData);
      localStorage.setItem('pendingMentions', JSON.stringify(pendingMentions));
      
      // Send notification to mentioned user via socket
      socket?.emit('story_mention_notification', {
        storyId: activeStory.id,
        mentionedUser: friendName,
        mentionedBy: user?.name,
        storyMedia: activeStory.mediaUrl,
        timestamp: new Date().toISOString()
      });
    }
    setShowMentionModal(false);
    setMentionSearch('');
    setSelectedMentions([]);
  };

  // 4. Say Hi after viewing story
  const sayHiToStoryOwner = () => {
    if (!justViewedStory) return;
    
    const hiData = {
      type: 'say_hi',
      storyId: justViewedStory.id,
      storyUser: justViewedStory.userName,
      storyUserPic: justViewedStory.userPic,
      storyMedia: justViewedStory.mediaUrl,
      message: `👋 Saw your story!`,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('pendingSayHi', JSON.stringify(hiData));
    
    // Emit story reaction in chat
    socket?.emit('story_reaction_in_chat', {
      storyId: justViewedStory.id,
      storyUser: justViewedStory.userName,
      reaction: '👋 Saw your story!',
      reactedBy: user?.name,
      timestamp: new Date().toISOString()
    });
    
    navigate('/chat', { state: { selectedUser: { name: justViewedStory.userName, pic: justViewedStory.userPic, _id: justViewedStory.userId } } });
    setShowSayHiButton(false);
    setShowStoryViewer(false);
  };

  // 5. Send story reaction to chat
  const sendStoryReactionToChat = (emoji: string) => {
    if (!activeStory) return;
    
    const reactionData = {
      type: 'story_reaction',
      storyId: activeStory.id,
      storyUser: activeStory.userName,
      storyUserPic: activeStory.userPic,
      storyMedia: activeStory.mediaUrl,
      reaction: emoji,
      reactedBy: user?.name,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('pendingStoryReaction', JSON.stringify(reactionData));
    
    // Emit socket event
    socket?.emit('story_reaction_in_chat', {
      storyId: activeStory.id,
      storyUser: activeStory.userName,
      reaction: emoji,
      reactedBy: user?.name,
      timestamp: new Date().toISOString()
    });
    
    // Navigate to chat with story owner
    navigate('/chat', { state: { selectedUser: { name: activeStory.userName, pic: activeStory.userPic, _id: activeStory.userId } } });
    setShowStoryViewer(false);
  };

  // Load friends and mentions from localStorage on mount
  useEffect(() => {
    const savedMentions = localStorage.getItem('storyMentions');
    if (savedMentions) {
      setStoryMentions(JSON.parse(savedMentions));
    }
    
    // Load friends list from localStorage or use mock data
    const savedFriends = localStorage.getItem('friends');
    if (savedFriends) {
      setFriendsList(JSON.parse(savedFriends));
    } else {
      // Mock friends list
      setFriendsList([
        { _id: '1', name: 'Demo User', email: 'demo@example.com', pic: 'https://picsum.photos/seed/demo/200/200', isVerified: false },
        { _id: '2', name: 'Friend 1', email: 'friend1@example.com', pic: 'https://picsum.photos/seed/friend1/200/200', isVerified: false },
        { _id: '3', name: 'Friend 2', email: 'friend2@example.com', pic: 'https://picsum.photos/seed/friend2/200/200', isVerified: false },
        { _id: '4', name: 'Friend 3', email: 'friend3@example.com', pic: 'https://picsum.photos/seed/friend3/200/200', isVerified: false },
      ]);
    }

    // Load groups list from localStorage
    const savedGroups = localStorage.getItem('userGroups');
    if (savedGroups) {
      setGroupsList(JSON.parse(savedGroups));
    }
  }, []);

  // Modified openStoryViewer to show "Say Hi" button for other users' stories
  const handleStoryView = (story: Story, groupIndex: number, storyIndex: number) => {
    setActiveStory(story);
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(storyIndex);
    setShowStoryViewer(true);
    setProgress(0);
    setViewedStories(prev => new Set(prev).add(story.id));
    addViewer(story.id);
    
    // Show "Say Hi" button if viewing someone else's story
    if (story.userName !== user?.name) {
      setShowSayHiButton(true);
      setJustViewedStory(story);
    } else {
      setShowSayHiButton(false);
      setJustViewedStory(null);
    }
  };

  return (
    <div className={cn("min-h-screen overflow-x-hidden", isDarkMode ? "bg-slate-950" : "bg-gray-50")}>
      <Navbar
        user={user}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        socketConnected={socketConnected ?? socket?.connected ?? false}
        storiesCount={newStoriesCount}
        onProfileClick={() => navigate('/profile')}
      />

      {/* Hero Section */}
      <div className={cn("relative overflow-hidden", isDarkMode ? "bg-slate-900/50" : "bg-gradient-to-br from-purple-100 via-pink-50 to-blue-50")}>
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-transparent rounded-full blur-3xl"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20"
              >
                <Sparkles className="w-8 h-8" />
              </motion.div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className={cn("text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                    Stories
                  </h1>
                  {newStoriesCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-black rounded-full shadow-lg shadow-purple-500/20"
                    >
                      {newStoriesCount} NEW
                    </motion.span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className={cn("text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                    <span className="text-emerald-500">{stories.filter(s => !s.isArchived).length}</span> active
                  </span>
                  <span className={cn("text-xs", isDarkMode ? "text-slate-600" : "text-slate-400")}>•</span>
                  <span className={cn("text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                    <span className="text-purple-500">{viewedStories.size}</span> viewed
                  </span>
                  {archivedStories.length > 0 && (
                    <>
                      <span className={cn("text-xs", isDarkMode ? "text-slate-600" : "text-slate-400")}>•</span>
                      <span className={cn("text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                        <span className="text-orange-500">{archivedStories.length}</span> archived
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {newStoriesCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const allStoryIds = stories.filter(s => !s.isArchived).map(s => s.id);
                    setViewedStories(new Set(allStoryIds));
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
                    isDarkMode
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-white text-slate-700 hover:bg-slate-50 shadow-md"
                  )}
                >
                  <Eye className="w-4 h-4" />
                  Mark all seen
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,video/*';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) handleStoryFileSelect(file);
                  };
                  input.click();
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-purple-500 text-white rounded-xl font-black text-sm uppercase tracking-wide transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
              >
                <Plus className="w-4 h-4" />
                Add Story
              </motion.button>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-2 mt-6">
            {[
              { id: 'all', label: 'All Stories', icon: Sparkles, count: stories.filter(s => !s.isArchived).length },
              { id: 'closeFriends', label: 'Close Friends', icon: UserPlus, count: stories.filter(s => (closeFriends.has(s.userName) || s.isCloseFriend) && !s.isArchived).length },
              { id: 'friends', label: 'Friends', icon: Users, count: stories.filter(s => s.userName !== user?.name && !s.isArchived).length },
              { id: 'archived', label: 'Archived', icon: Archive, count: archivedStories.length },
              { id: 'highlights', label: 'Highlights', icon: Star, count: highlightedStories.length },
            ].map((cat) => (
              <motion.button
                key={cat.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={cn(
                  "px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
                  selectedCategory === cat.id
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : isDarkMode
                      ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      : "bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
                )}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
                <span className={cn(
                  "px-1.5 py-0.5 text-xs rounded-full",
                  selectedCategory === cat.id ? "bg-white/20" : isDarkMode ? "bg-slate-700" : "bg-slate-200"
                )}>
                  {cat.count}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Stories Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className={cn("text-lg font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                {selectedCategory === 'all' ? 'Recent Stories' :
                 selectedCategory === 'closeFriends' ? 'Close Friends' :
                 selectedCategory === 'friends' ? 'Friend Stories' :
                 selectedCategory === 'archived' ? 'Archived Stories' :
                 selectedCategory === 'highlights' ? 'Story Highlights' : 'Stories'}
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  Last 24 hours
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* NEW: Skeleton Loader */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {[...Array(8)].map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "aspect-[3/4] rounded-3xl overflow-hidden animate-pulse",
                  isDarkMode ? "bg-slate-800" : "bg-slate-200"
                )}
              >
                <div className={cn(
                  "h-full w-full",
                  isDarkMode
                    ? "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800"
                    : "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-200"
                )}>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className={cn("h-4 w-24 rounded mb-2", isDarkMode ? "bg-slate-600" : "bg-slate-400")} />
                    <div className={cn("h-3 w-16 rounded", isDarkMode ? "bg-slate-700" : "bg-slate-300")} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Story Cards Grid */}
        <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5", isLoading && "hidden")}>
          {(() => {
            const displayStories = getDisplayStories();
            const groups: { [key: string]: Story[] } = {};

            displayStories.forEach(story => {
              if (!groups[story.userName]) {
                groups[story.userName] = [];
              }
              groups[story.userName].push(story);
            });

            const groupEntries = Object.entries(groups);

            if (groupEntries.length === 0) {
              return (
                <div className="col-span-full py-20 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md mx-auto"
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h3 className={cn("text-2xl font-bold mb-3", isDarkMode ? "text-white" : "text-slate-900")}>
                      No Stories Found
                    </h3>
                    <p className={cn("text-base mb-6", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      {selectedCategory === 'archived'
                        ? "You haven't archived any stories yet"
                        : selectedCategory === 'closeFriends'
                        ? "Add close friends to see their stories here"
                        : selectedCategory === 'highlights'
                        ? "Create highlights to save your best stories"
                        : "Be the first to share your story!"}
                    </p>
                    {selectedCategory !== 'archived' && selectedCategory !== 'highlights' && (
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,video/*';
                          input.onchange = (e: any) => {
                            const file = e.target.files?.[0];
                            if (file) handleStoryFileSelect(file);
                          };
                          input.click();
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-purple-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-xl transition-all"
                      >
                        Create Story
                      </button>
                    )}
                  </motion.div>
                </div>
              );
            }

            return groupEntries.map(([userName, userStories], groupIdx) => {
              const firstStory = userStories[0];
              const hasUnseen = userStories.some(s => !viewedStories.has(s.id));
              const isCloseFriend = closeFriends.has(userName) || firstStory.isCloseFriend;
              const isMuted = mutedUsers.has(userName);
              const isCurrentUser = userName === (user?.name || 'You');
              const totalReactions = userStories.reduce((acc, s) => acc + (s.reactions?.length || 0), 0);
              const totalViewers = userStories.reduce((acc, s) => acc + (s.viewers?.length || 0), 0);

              return (
                <motion.div
                  key={userName}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: groupIdx * 0.08, duration: 0.5, type: "spring", stiffness: 300 }}
                  className="relative"
                >
                  {/* Story Card */}
                  <motion.div
                    whileHover={{ scale: 1.05, y: -8 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleStoryView(firstStory, groupIdx, 0)}
                    className={cn(
                      "relative aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 group",
                      "shadow-lg hover:shadow-2xl"
                    )}
                  >
                    {/* Gradient Ring Border for Unseen Stories */}
                    <div className={cn(
                      "absolute -inset-[3px] rounded-3xl transition-all duration-500",
                      hasUnseen
                        ? "bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 animate-pulse"
                        : "bg-slate-300 dark:bg-slate-600"
                    )}>
                      <div className={cn(
                        "absolute inset-[3px] rounded-3xl",
                        isDarkMode ? "bg-slate-900" : "bg-white"
                      )} />
                    </div>

                    {/* Verified User Badge */}
                    {firstStory.isVerified && (
                      <div className="absolute -top-1 -left-1 z-20 w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <BadgeCheck className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* Trending Badge */}
                    {firstStory.isTrending && (
                      <div className="absolute -top-1 left-6 z-20 px-2 py-0.5 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center gap-1 shadow-lg">
                        <Flame className="w-3 h-3 text-white" />
                        <span className="text-white text-[10px] font-bold">TRENDING</span>
                      </div>
                    )}

                    {/* Close Friend Indicator */}
                    {isCloseFriend && (
                      <div className="absolute -top-1 -right-1 z-20 w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                        <Star className="w-3 h-3 text-white fill-white" />
                      </div>
                    )}

                    {/* Story Count Badge */}
                    {userStories.length > 1 && (
                      <div className="absolute top-3 right-3 z-20 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                        <span className="text-white text-xs font-bold">{userStories.length}</span>
                      </div>
                    )}

                    {/* Media Content */}
                    <div className="absolute inset-[3px] rounded-[22px] overflow-hidden">
                      {firstStory.mediaType === 'video' ? (
                        <video
                          src={firstStory.mediaUrl}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          muted
                          loop
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => e.currentTarget.pause()}
                        />
                      ) : (
                        <img
                          src={firstStory.mediaUrl}
                          alt={userName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      )}

                      {/* Blur Background Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent backdrop-blur-[1px]" />

                      {/* Play Button on Hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                          <Play className="w-7 h-7 text-white fill-white" />
                        </div>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2",
                          hasUnseen
                            ? "border-purple-400"
                            : "border-white/30"
                        )}>
                          <img
                            src={firstStory.userPic}
                            alt={userName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-bold truncate">
                            {userName}
                          </p>
                          <p className="text-white/60 text-xs">
                            {new Date(firstStory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-3 mt-3">
                        {totalViewers > 0 && (
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-white/70" />
                            <span className="text-white/70 text-xs font-medium">{totalViewers}</span>
                          </div>
                        )}
                        {totalReactions > 0 && (
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-white/70" />
                            <span className="text-white/70 text-xs font-medium">{totalReactions}</span>
                          </div>
                        )}
                        {firstStory.isHighlight && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-yellow-400 text-xs font-medium">Highlight</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unseen Indicator Dot */}
                    {hasUnseen && (
                      <div className="absolute top-3 left-3 w-3 h-3 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full animate-pulse shadow-lg" />
                    )}
                  </motion.div>

                  {/* User Menu Button */}
                  {!isCurrentUser && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUserMenu(showUserMenu === userName ? null : userName);
                      }}
                      className="absolute top-2 right-2 z-30 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                    >
                      <MoreVertical className="w-4 h-4 text-white" />
                    </button>
                  )}

                  {/* User Menu Dropdown */}
                  <AnimatePresence>
                    {showUserMenu === userName && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className={cn(
                          "absolute top-12 right-0 z-40 w-48 rounded-xl shadow-2xl overflow-hidden",
                          isDarkMode ? "bg-slate-800" : "bg-white"
                        )}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCloseFriend(userName);
                          }}
                          className={cn(
                            "w-full px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors",
                            isDarkMode
                              ? "hover:bg-slate-700 text-slate-200"
                              : "hover:bg-gray-100 text-slate-700"
                          )}
                        >
                          <UserPlus className={cn("w-4 h-4", isCloseFriend && "text-emerald-500")} />
                          {isCloseFriend ? 'Remove from Close Friends' : 'Add to Close Friends'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMuteUser(userName);
                          }}
                          className={cn(
                            "w-full px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors",
                            isDarkMode
                              ? "hover:bg-slate-700 text-slate-200"
                              : "hover:bg-gray-100 text-slate-700"
                          )}
                        >
                          {isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                          {isMuted ? 'Unmute Stories' : 'Mute Stories'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            });
          })()}
        </div>
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {showStoryViewer && activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 z-[200] flex items-center justify-center",
              isDarkMode ? "bg-black/95" : "bg-slate-950/95"
            )}
            onClick={() => setShowStoryViewer(false)}
          >
            {/* Blur Background Effect */}
            <div
              className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110"
              style={{ backgroundImage: `url(${activeStory.mediaUrl})` }}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "relative z-10 overflow-hidden shadow-2xl",
                isFullScreen
                  ? "fixed inset-0 w-full h-full rounded-none"
                  : "max-w-md w-full h-[85vh] rounded-3xl"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Story Container */}
              <div className="relative w-full h-full bg-black">
                {/* Top Progress Bars */}
                <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2">
                  {(() => {
                    const groups = groupedStoriesRef.current();
                    const groupKeys = Object.keys(groups);
                    const currentGroup = groupKeys[activeGroupIndex];
                    const currentGroupStories = groups[currentGroup] || [];

                    return currentGroupStories.map((story, idx) => (
                      <div key={story.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <motion.div
                          className={cn(
                            "h-full rounded-full",
                            idx === activeStoryIndex
                              ? "bg-gradient-to-r from-purple-500 to-pink-500"
                              : idx < activeStoryIndex
                              ? "bg-white"
                              : "bg-transparent"
                          )}
                          initial={idx === activeStoryIndex ? { width: 0 } : { width: idx < activeStoryIndex ? "100%" : "0%" }}
                          animate={idx === activeStoryIndex ? { width: `${progress}%` } : { width: idx < activeStoryIndex ? "100%" : "0%" }}
                          transition={{ duration: 0.05, ease: "linear" }}
                        />
                      </div>
                    ));
                  })()}
                </div>

                {/* Header Info */}
                <div className="absolute top-6 left-0 right-0 z-30 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50">
                        <img
                          src={activeStory.userPic}
                          alt={activeStory.userName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{activeStory.userName}</p>
                        <p className="text-white/60 text-xs">
                          {new Date(activeStory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Story Audio Button */}
                      {activeStory?.audioUrl && (
                        <button
                          onClick={toggleStoryAudio}
                          className={cn(
                            "w-8 h-8 backdrop-blur-md rounded-full flex items-center justify-center transition-colors",
                            storyAudioPlaying
                              ? "bg-purple-500 text-white"
                              : "bg-white/20 text-white hover:bg-white/30"
                          )}
                        >
                          {storyAudioPlaying ? (
                            <Music2 className="w-4 h-4" />
                          ) : (
                            <Music className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Dark/Light Mode Toggle */}
                      <button
                        onClick={() => setViewerDarkMode(!viewerDarkMode)}
                        className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        {viewerDarkMode ? (
                          <Moon className="w-4 h-4 text-white" />
                        ) : (
                          <Sun className="w-4 h-4 text-white" />
                        )}
                      </button>

                      {/* Fullscreen Toggle */}
                      <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        {isFullScreen ? (
                          <Minimize2 className="w-4 h-4 text-white" />
                        ) : (
                          <Maximize2 className="w-4 h-4 text-white" />
                        )}
                      </button>

                      {/* Close Button */}
                      <button
                        onClick={() => setShowStoryViewer(false)}
                        className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Story Media with Hold to Pause & Swipe Navigation */}
                <div
                  className="relative w-full h-full"
                  onMouseDown={handleHoldStart}
                  onMouseUp={handleHoldEnd}
                  onMouseLeave={handleHoldEnd}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Pause Indicator */}
                  <AnimatePresence>
                    {isPaused && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-black/30"
                      >
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                          <Pause className="w-8 h-8 text-white fill-white" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {activeStory.mediaType === 'video' ? (
                    <video
                      ref={videoRef}
                      src={activeStory.mediaUrl}
                      autoPlay
                      muted={isMuted}
                      className="w-full h-full object-contain"
                      onEnded={handleNextStory}
                    />
                  ) : (
                    <img
                      src={activeStory.mediaUrl}
                      alt={activeStory.userName}
                      className="w-full h-full object-contain"
                    />
                  )}

                  {/* Hidden Audio Element for Story Music */}
                  {activeStory.audioUrl && (
                    <audio
                      ref={storyAudioRef}
                      src={activeStory.audioUrl}
                      loop
                      className="hidden"
                      onPlay={() => setStoryAudioPlaying(true)}
                      onPause={() => setStoryAudioPlaying(false)}
                      onEnded={() => setStoryAudioPlaying(false)}
                    />
                  )}
                </div>

                {/* Navigation Areas */}
                <div className="absolute inset-y-0 left-0 w-1/4 z-20" onClick={handlePrevStory} />
                <div className="absolute inset-y-0 right-0 w-1/4 z-20" onClick={handleNextStory} />

                {/* Navigation Buttons */}
                <button
                  onClick={handlePrevStory}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all opacity-0 hover:opacity-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={handleNextStory}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all opacity-0 hover:opacity-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* NEW: AI Feature Buttons */}
                <div className="absolute bottom-32 left-0 right-0 z-30 px-4">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowAICaptionModal(true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur-md rounded-full text-white text-xs font-medium flex items-center gap-1.5 hover:shadow-lg transition-all"
                    >
                      <Wand2 className="w-3 h-3" />
                      AI Caption
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStoryForStickers(activeStory.id);
                        setShowStickerPicker(true);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-yellow-500/80 to-orange-500/80 backdrop-blur-md rounded-full text-white text-xs font-medium flex items-center gap-1.5 hover:shadow-lg transition-all"
                    >
                      <Sticker className="w-3 h-3" />
                      Auto Stickers
                    </button>
                    <button
                      onClick={() => setShowHashtagModal(true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-500/80 to-indigo-500/80 backdrop-blur-md rounded-full text-white text-xs font-medium flex items-center gap-1.5 hover:shadow-lg transition-all"
                    >
                      <Hash className="w-3 h-3" />
                      Smart Tags
                    </button>
                    <button
                      onClick={() => setShowTranslateModal(true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-green-500/80 to-teal-500/80 backdrop-blur-md rounded-full text-white text-xs font-medium flex items-center gap-1.5 hover:shadow-lg transition-all"
                    >
                      <Languages className="w-3 h-3" />
                      Translate
                    </button>
                    <button
                      onClick={() => setShowSummaryModal(true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-orange-500/80 to-red-500/80 backdrop-blur-md rounded-full text-white text-xs font-medium flex items-center gap-1.5 hover:shadow-lg transition-all"
                    >
                      <FileText className="w-3 h-3" />
                      Summary
                    </button>
                  </div>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  {/* Reactions Bar - Clicking sends reaction to chat */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {STORY_REACTIONS.map((emoji) => (
                      <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => sendStoryReactionToChat(emoji)}
                        className="text-2xl hover:drop-shadow-lg transition-all"
                        title={`Send ${emoji} reaction and open chat`}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>

                  {/* Story-Chat Integration Buttons */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {/* Reply to Story Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowReplyModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors"
                    >
                      <Reply className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">Reply</span>
                    </motion.button>

                    {/* Mention Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowMentionModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors"
                    >
                      <AtSign className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">Mention</span>
                    </motion.button>
                  </div>

                  {/* Say Hi Button - Shown after viewing someone's story */}
                  {showSayHiButton && justViewedStory?.userName === activeStory.userName && activeStory.userName !== user?.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center mb-4"
                    >
                      <button
                        onClick={sayHiToStoryOwner}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-bold hover:shadow-lg transition-all"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <span>Say Hi to {activeStory.userName}</span>
                      </button>
                    </motion.div>
                  )}

                  {/* Seen Count & Viewers */}
                  <button
                    onClick={() => {
                      setStoryViewers(activeStory.viewers || []);
                      setShowViewersModal(true);
                    }}
                    className="flex items-center gap-2 mb-4 text-white/70 hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">{(activeStory.viewers || []).length} views</span>
                    {(activeStory.reactions || []).length > 0 && (
                      <>
                        <span className="text-white/30">•</span>
                        <Heart className="w-4 h-4" />
                        <span className="text-sm font-medium">{(activeStory.reactions || []).length} reactions</span>
                      </>
                    )}
                  </button>

                  {/* Reply Input */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addReply(activeStory.id, replyText)}
                        placeholder="Reply to story..."
                        className="w-full px-4 py-3 pr-12 bg-white/20 backdrop-blur-md rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                      />
                      <button
                        onClick={() => addReply(activeStory.id, replyText)}
                        disabled={!replyText.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center disabled:opacity-50"
                      >
                        <Send className="w-4 h-4 text-slate-900" />
                      </button>
                    </div>

                    {/* More Actions */}
                    <div className="flex items-center gap-2">
                      {activeStory.userName === (user?.name || 'You') && (
                        <>
                          <button
                            onClick={() => archiveStory(activeStory.id)}
                            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                            title="Archive Story"
                          >
                            <Archive className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => addToHighlights(activeStory.id)}
                            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                            title="Add to Highlights"
                          >
                            <Star className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => deleteStory(activeStory.id)}
                            className="w-10 h-10 bg-red-500/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-red-500/70 transition-colors"
                            title="Delete Story"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                        title="Mute/Unmute"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                      </button>
                      <button
                        onClick={() => setShowShareToChatModal(true)}
                        className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                        title="Share to Chat"
                      >
                        <Share2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewers Modal */}
      <AnimatePresence>
        {showViewersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowViewersModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "w-full max-w-md max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={cn(
                "flex items-center justify-between p-4 border-b",
                isDarkMode ? "border-slate-700" : "border-gray-200"
              )}>
                <div className="flex items-center gap-3">
                  <Eye className={cn("w-5 h-5", isDarkMode ? "text-slate-400" : "text-slate-500")} />
                  <h3 className={cn("font-bold text-lg", isDarkMode ? "text-white" : "text-slate-900")}>
                    {storyViewers.length} Viewers
                  </h3>
                </div>
                <button
                  onClick={() => setShowViewersModal(false)}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-slate-500"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Viewers List */}
              <div className={cn(
                "overflow-y-auto max-h-[50vh] p-2",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}>
                {storyViewers.length === 0 ? (
                  <div className="text-center py-8">
                    <EyeOff className={cn("w-12 h-12 mx-auto mb-3", isDarkMode ? "text-slate-600" : "text-slate-300")} />
                    <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      No viewers yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {storyViewers.map((viewer, idx) => (
                      <motion.div
                        key={viewer.userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-colors",
                          isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
                        )}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <img
                            src={viewer.userPic}
                            alt={viewer.userName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className={cn("font-medium text-sm", isDarkMode ? "text-white" : "text-slate-900")}>
                            {viewer.userName}
                          </p>
                          <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                            {new Date(viewer.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply to Story Modal */}
      <AnimatePresence>
        {showReplyModal && activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowReplyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "w-full max-w-md rounded-2xl overflow-hidden shadow-2xl",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn(
                "flex items-center justify-between p-4 border-b",
                isDarkMode ? "border-slate-700" : "border-gray-200"
              )}>
                <div className="flex items-center gap-3">
                  <Reply className={cn("w-5 h-5", isDarkMode ? "text-slate-400" : "text-slate-500")} />
                  <h3 className={cn("font-bold text-lg", isDarkMode ? "text-white" : "text-slate-900")}>
                    Reply to Story
                  </h3>
                </div>
                <button
                  onClick={() => setShowReplyModal(false)}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-slate-500"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4">
                {/* Story Preview */}
                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gray-100 dark:bg-slate-800">
                  <div className="w-12 h-12 rounded-lg overflow-hidden">
                    <img src={activeStory.mediaUrl} alt="Story" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className={cn("font-medium text-sm", isDarkMode ? "text-white" : "text-slate-900")}>
                      {activeStory.userName}'s Story
                    </p>
                    <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Reply will be sent as a chat message
                    </p>
                  </div>
                </div>

                {/* Reply Input */}
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  rows={3}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl resize-none focus:outline-none focus:ring-2",
                    isDarkMode 
                      ? "bg-slate-800 text-white placeholder-slate-500 focus:ring-purple-500" 
                      : "bg-gray-100 text-slate-900 placeholder-slate-400 focus:ring-purple-500"
                  )}
                />

                <button
                  onClick={replyToStory}
                  disabled={!replyText.trim()}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Send & Open Chat
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share to Chat Modal */}
      <AnimatePresence>
        {showShareToChatModal && activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowShareToChatModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "w-full max-w-md rounded-2xl overflow-hidden shadow-2xl",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn(
                "flex items-center justify-between p-4 border-b",
                isDarkMode ? "border-slate-700" : "border-gray-200"
              )}>
                <div className="flex items-center gap-3">
                  <Share2 className={cn("w-5 h-5", isDarkMode ? "text-slate-400" : "text-slate-500")} />
                  <h3 className={cn("font-bold text-lg", isDarkMode ? "text-white" : "text-slate-900")}>
                    Share Story
                  </h3>
                </div>
                <button
                  onClick={() => setShowShareToChatModal(false)}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-slate-500"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Story Preview Card */}
              <div className="p-4">
                <div className={cn(
                  "p-4 rounded-xl border-2 border-dashed",
                  isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-gray-300 bg-gray-50"
                )}>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden">
                      <img src={activeStory.mediaUrl} alt="Story" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className={cn("font-medium text-sm", isDarkMode ? "text-white" : "text-slate-900")}>
                        {activeStory.userName}'s Story
                      </p>
                      <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        {activeStory.mediaType === 'video' ? 'Video' : 'Photo'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className={cn("mt-4 mb-3 text-sm font-medium", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                  Share with:
                </p>

                {/* Friends List */}
                <div className={cn(
                  "max-h-60 overflow-y-auto rounded-xl",
                  isDarkMode ? "bg-slate-800" : "bg-gray-50"
                )}>
                  {friendsList.length === 0 ? (
                    <p className="p-4 text-center text-sm text-slate-400">No friends found</p>
                  ) : (
                    friendsList.map((friend) => (
                      <button
                        key={friend._id}
                        onClick={() => shareStoryToChat([friend._id], 'friends')}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 transition-colors",
                          isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100"
                        )}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <img src={friend.pic} alt={friend.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={cn("font-medium text-sm", isDarkMode ? "text-white" : "text-slate-900")}>
                            {friend.name}
                          </p>
                        </div>
                        <Share2 className={cn("w-4 h-4", isDarkMode ? "text-slate-400" : "text-slate-500")} />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mention Friend Modal */}
      <AnimatePresence>
        {showMentionModal && activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowMentionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "w-full max-w-md rounded-2xl overflow-hidden shadow-2xl",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn(
                "flex items-center justify-between p-4 border-b",
                isDarkMode ? "border-slate-700" : "border-gray-200"
              )}>
                <div className="flex items-center gap-3">
                  <AtSign className={cn("w-5 h-5", isDarkMode ? "text-slate-400" : "text-slate-500")} />
                  <h3 className={cn("font-bold text-lg", isDarkMode ? "text-white" : "text-slate-900")}>
                    Mention Friend
                  </h3>
                </div>
                <button
                  onClick={() => setShowMentionModal(false)}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-slate-500"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                {/* Search Input */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={mentionSearch}
                    onChange={(e) => setMentionSearch(e.target.value)}
                    placeholder="Search friends..."
                    className={cn(
                      "w-full px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2",
                      isDarkMode 
                        ? "bg-slate-800 text-white placeholder-slate-500 focus:ring-purple-500" 
                        : "bg-gray-100 text-slate-900 placeholder-slate-400 focus:ring-purple-500"
                    )}
                  />
                  <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDarkMode ? "text-slate-500" : "text-slate-400")} />
                </div>

                {/* Friends List */}
                <div className={cn(
                  "max-h-60 overflow-y-auto rounded-xl",
                  isDarkMode ? "bg-slate-800" : "bg-gray-50"
                )}>
                  {friendsList
                    .filter(f => f.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                    .map((friend) => {
                      const isMentioned = (storyMentions[activeStory.id] || []).includes(friend.name);
                      return (
                        <button
                          key={friend._id}
                          onClick={() => handleMention(friend.name)}
                          disabled={isMentioned}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 transition-colors",
                            isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100",
                            isMentioned && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            <img src={friend.pic} alt={friend.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className={cn("font-medium text-sm", isDarkMode ? "text-white" : "text-slate-900")}>
                              {friend.name}
                            </p>
                          </div>
                          {isMentioned ? (
                            <span className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              Mentioned
                            </span>
                          ) : (
                            <AtSign className={cn("w-4 h-4", isDarkMode ? "text-slate-400" : "text-slate-500")} />
                          )}
                        </button>
                      );
                    })}
                </div>

                <p className={cn("mt-3 text-xs text-center", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  Mentioned friends will receive a notification
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(null)}
        />
      )}

      {/* NEW: Floating Add Story Button */}
      <AnimatePresence>
        {showFloatingButton && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*,video/*';
              input.onchange = (e: any) => {
                const file = e.target.files?.[0];
                if (file) handleStoryFileSelect(file);
              };
              input.click();
            }}
            className="fixed bottom-8 right-8 z-40 w-16 h-16 bg-gradient-to-r from-emerald-500 to-purple-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:shadow-emerald-500/50 transition-shadow"
          >
            <Plus className="w-8 h-8" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* NEW: AI Caption Modal */}
      <AnimatePresence>
        {showAICaptionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAICaptionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "max-w-md w-full rounded-2xl p-6 shadow-2xl",
                isDarkMode ? "bg-slate-800" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                  AI Caption Generator
                </h3>
              </div>
              
              {isGeneratingCaption ? (
                <div className="flex flex-col items-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className={cn("w-8 h-8", isDarkMode ? "text-purple-400" : "text-purple-500")} />
                  </motion.div>
                  <p className={cn("mt-4 text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Generating creative caption...
                  </p>
                </div>
              ) : aiCaption ? (
                <div className="space-y-4">
                  <p className={cn("text-lg text-center py-4", isDarkMode ? "text-white" : "text-slate-900")}>
                    {aiCaption}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setAiCaption('')}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
                        isDarkMode
                          ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <RefreshCw className="w-4 h-4 inline mr-2" />
                      Regenerate
                    </button>
                    <button
                      onClick={() => applyAICaption(activeStory?.id || '')}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 inline mr-2" />
                      Use Caption
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className={cn("text-sm mb-4", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Let AI create an engaging caption for your story!
                  </p>
                  <button
                    onClick={generateAICaption}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all"
                  >
                    <BrainCircuit className="w-4 h-4 inline mr-2" />
                    Generate Caption
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW: Smart Hashtags Modal */}
      <AnimatePresence>
        {showHashtagModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHashtagModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "max-w-md w-full rounded-2xl p-6 shadow-2xl",
                isDarkMode ? "bg-slate-800" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Hash className="w-5 h-5 text-white" />
                </div>
                <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                  Smart Hashtags
                </h3>
              </div>
              
              {isGeneratingHashtags ? (
                <div className="flex flex-col items-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className={cn("w-8 h-8", isDarkMode ? "text-blue-400" : "text-blue-500")} />
                  </motion.div>
                  <p className={cn("mt-4 text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Analyzing and generating hashtags...
                  </p>
                </div>
              ) : smartHashtags.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 justify-center py-4">
                    {smartHashtags.map((tag, idx) => (
                      <motion.span
                        key={tag}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className={cn(
                          "px-3 py-1 rounded-full text-sm font-medium",
                          isDarkMode
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-blue-100 text-blue-700"
                        )}
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSmartHashtags([])}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
                        isDarkMode
                          ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <RefreshCw className="w-4 h-4 inline mr-2" />
                      Regenerate
                    </button>
                    <button
                      onClick={() => applyHashtags(activeStory?.id || '')}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 inline mr-2" />
                      Add Hashtags
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className={cn("text-sm mb-4", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Get AI-suggested hashtags to boost your story's reach!
                  </p>
                  <button
                    onClick={() => generateSmartHashtags()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all"
                  >
                    <Lightbulb className="w-4 h-4 inline mr-2" />
                    Generate Hashtags
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW: Translation Modal */}
      <AnimatePresence>
        {showTranslateModal && activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTranslateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "max-w-md w-full rounded-2xl p-6 shadow-2xl",
                isDarkMode ? "bg-slate-800" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                  <Languages className="w-5 h-5 text-white" />
                </div>
                <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                  Translate Story
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={cn(
                      "p-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 justify-center",
                      selectedLanguage === lang.code
                        ? "bg-gradient-to-r from-green-500 to-teal-500 text-white"
                        : isDarkMode
                          ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span className="hidden sm:inline">{lang.name}</span>
                  </button>
                ))}
              </div>

              {isTranslating ? (
                <div className="flex flex-col items-center py-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className={cn("w-6 h-6", isDarkMode ? "text-green-400" : "text-green-500")} />
                  </motion.div>
                </div>
              ) : translatedText[activeStory.id] ? (
                <div className={cn(
                  "p-4 rounded-xl mb-4",
                  isDarkMode ? "bg-slate-700" : "bg-slate-100"
                )}>
                  <p className={cn("text-sm", isDarkMode ? "text-white" : "text-slate-900")}>
                    {translatedText[activeStory.id]}
                  </p>
                </div>
              ) : null}

              <button
                onClick={() => translateStory(activeStory, selectedLanguage)}
                disabled={isTranslating}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Globe className="w-4 h-4 inline mr-2" />
                Translate
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW: Story Summary Modal */}
      <AnimatePresence>
        {showSummaryModal && activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSummaryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "max-w-lg w-full rounded-2xl p-6 shadow-2xl",
                isDarkMode ? "bg-slate-800" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                  Story Summary
                </h3>
              </div>

              {isGeneratingSummary ? (
                <div className="flex flex-col items-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className={cn("w-8 h-8", isDarkMode ? "text-orange-400" : "text-orange-500")} />
                  </motion.div>
                  <p className={cn("mt-4 text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Analyzing story content...
                  </p>
                </div>
              ) : storySummary ? (
                <div className={cn(
                  "p-4 rounded-xl mb-4",
                  isDarkMode ? "bg-slate-700" : "bg-slate-100"
                )}>
                  <p className={cn("text-sm leading-relaxed", isDarkMode ? "text-white" : "text-slate-900")}>
                    {storySummary}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className={cn("text-sm mb-4", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Get an AI-generated summary of this story!
                  </p>
                  <button
                    onClick={() => generateStorySummary(activeStory)}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all"
                  >
                    <BrainCircuit className="w-4 h-4 inline mr-2" />
                    Generate Summary
                  </button>
                </div>
              )}

              {storySummary && (
                <button
                  onClick={() => {
                    setStorySummary('');
                    generateStorySummary(activeStory);
                  }}
                  className={cn(
                    "w-full py-3 rounded-xl font-bold text-sm transition-all mt-4",
                    isDarkMode
                      ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Regenerate Summary
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW: Sticker Picker Modal */}
      <AnimatePresence>
        {showStickerPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowStickerPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "max-w-sm w-full rounded-2xl p-4 shadow-2xl",
                isDarkMode ? "bg-slate-800" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Sticker className="w-5 h-5 text-white" />
                  </div>
                  <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                    Auto Stickers
                  </h3>
                </div>
                <button
                  onClick={() => setShowStickerPicker(false)}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                  )}
                >
                  <X className={cn("w-5 h-5", isDarkMode ? "text-slate-400" : "text-slate-500")} />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-4">
                {availableStickers.map((sticker, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (selectedStoryForStickers) {
                        addAutoSticker(selectedStoryForStickers, sticker);
                      }
                    }}
                    className={cn(
                      "aspect-square rounded-xl text-2xl flex items-center justify-center transition-all",
                      isDarkMode
                        ? "bg-slate-700 hover:bg-slate-600"
                        : "bg-slate-100 hover:bg-slate-200"
                    )}
                  >
                    {sticker}
                  </motion.button>
                ))}
              </div>

              {selectedStoryForStickers && autoStickers[selectedStoryForStickers]?.length > 0 && (
                <div className={cn(
                  "p-3 rounded-xl",
                  isDarkMode ? "bg-slate-700" : "bg-slate-100"
                )}>
                  <p className={cn("text-xs font-medium mb-2", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Added Stickers:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {autoStickers[selectedStoryForStickers].map((sticker, idx) => (
                      <motion.button
                        key={idx}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        onClick={() => removeSticker(selectedStoryForStickers, idx)}
                        className="text-xl hover:scale-110 transition-transform"
                        title="Click to remove"
                      >
                        {sticker}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share to Chat Modal */}
      <AnimatePresence>
        {showShareToChatModal && activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setShowShareToChatModal(false);
              setSelectedShareTargets([]);
              setShareSearchQuery('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "w-full max-w-md max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={cn(
                "flex items-center justify-between p-4 border-b",
                isDarkMode ? "border-slate-700" : "border-gray-200"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    isDarkMode ? "bg-emerald-500/20" : "bg-emerald-100"
                  )}>
                    <Share2 className={cn("w-5 h-5", isDarkMode ? "text-emerald-400" : "text-emerald-600")} />
                  </div>
                  <div>
                    <h3 className={cn("font-bold text-lg", isDarkMode ? "text-white" : "text-slate-900")}>
                      Share Story
                    </h3>
                    <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      {activeStory.userName} ka story
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowShareToChatModal(false);
                    setSelectedShareTargets([]);
                    setShareSearchQuery('');
                  }}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-slate-500"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Story Preview */}
              <div className={cn(
                "p-3 border-b",
                isDarkMode ? "border-slate-700" : "border-gray-200"
              )}>
                <div className={cn(
                  "flex items-center gap-3 p-2 rounded-xl",
                  isDarkMode ? "bg-slate-800" : "bg-gray-50"
                )}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                    {activeStory.mediaType === 'video' ? (
                      <video src={activeStory.mediaUrl} className="w-full h-full object-cover" />
                    ) : (
                      <img src={activeStory.mediaUrl} alt="Story" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                      {activeStory.userName} ki story
                    </p>
                    <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      {activeStory.mediaType === 'video' ? 'Video' : 'Photo'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="p-4">
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl",
                  isDarkMode ? "bg-slate-800" : "bg-gray-100"
                )}>
                  <Search className={cn("w-4 h-4", isDarkMode ? "text-slate-400" : "text-slate-500")} />
                  <input
                    type="text"
                    placeholder="Search friends or groups..."
                    value={shareSearchQuery}
                    onChange={(e) => setShareSearchQuery(e.target.value)}
                    className={cn(
                      "flex-1 bg-transparent outline-none text-sm",
                      isDarkMode ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                    )}
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="px-4 pb-2">
                <div className={cn(
                  "flex gap-2 p-1 rounded-lg",
                  isDarkMode ? "bg-slate-800" : "bg-gray-100"
                )}>
                  <button
                    onClick={() => {
                      setShareActiveTab('friends');
                      setSelectedShareTargets([]);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                      shareActiveTab === 'friends'
                        ? "bg-emerald-500 text-white"
                        : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Users className="w-4 h-4" />
                    Friends ({friendsList.length})
                  </button>
                  <button
                    onClick={() => {
                      setShareActiveTab('groups');
                      setSelectedShareTargets([]);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                      shareActiveTab === 'groups'
                        ? "bg-emerald-500 text-white"
                        : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Users className="w-4 h-4" />
                    Groups ({groupsList.length})
                  </button>
                </div>
              </div>

              {/* Recipients List */}
              <div className="flex-1 overflow-y-auto p-4 max-h-64">
                {shareActiveTab === 'friends' ? (
                  <div className="space-y-2">
                    {friendsList.filter(f => f.name.toLowerCase().includes(shareSearchQuery.toLowerCase())).length > 0 ? (
                      friendsList
                        .filter(f => f.name.toLowerCase().includes(shareSearchQuery.toLowerCase()))
                        .map(friend => (
                          <motion.button
                            key={friend._id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedShareTargets(prev =>
                                prev.includes(friend._id)
                                  ? prev.filter(id => id !== friend._id)
                                  : [...prev, friend._id]
                              );
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                              selectedShareTargets.includes(friend._id)
                                ? isDarkMode ? "bg-emerald-500/20 border border-emerald-500/50" : "bg-emerald-50 border border-emerald-200"
                                : isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
                            )}
                          >
                            <img
                              src={friend.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=random`}
                              alt={friend.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1 text-left">
                              <p className={cn("font-medium", isDarkMode ? "text-white" : "text-slate-900")}>
                                {friend.name}
                              </p>
                              <p className="text-sm text-slate-500">
                                {friend.isVerified ? 'Verified' : 'Friend'}
                              </p>
                            </div>
                            {selectedShareTargets.includes(friend._id) && (
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
                        <Users className={cn("w-12 h-12 mx-auto mb-3", isDarkMode ? "text-slate-600" : "text-slate-300")} />
                        <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          {shareSearchQuery ? 'No friends found' : 'No friends available'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupsList.filter(g => g.name.toLowerCase().includes(shareSearchQuery.toLowerCase())).length > 0 ? (
                      groupsList
                        .filter(g => g.name.toLowerCase().includes(shareSearchQuery.toLowerCase()))
                        .map(group => (
                          <motion.button
                            key={group._id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedShareTargets(prev =>
                                prev.includes(group._id)
                                  ? prev.filter(id => id !== group._id)
                                  : [...prev, group._id]
                              );
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                              selectedShareTargets.includes(group._id)
                                ? isDarkMode ? "bg-emerald-500/20 border border-emerald-500/50" : "bg-emerald-50 border border-emerald-200"
                                : isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
                            )}
                          >
                            <div className="relative">
                              <img
                                src={group.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=random`}
                                alt={group.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                                <Users className="w-3 h-3 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 text-left">
                              <p className={cn("font-medium", isDarkMode ? "text-white" : "text-slate-900")}>
                                {group.name}
                              </p>
                              <p className="text-sm text-slate-500">
                                {group.members?.length || 0} members
                              </p>
                            </div>
                            {selectedShareTargets.includes(group._id) && (
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
                        <Users className={cn("w-12 h-12 mx-auto mb-3", isDarkMode ? "text-slate-600" : "text-slate-300")} />
                        <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          {shareSearchQuery ? 'No groups found' : 'No groups available'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={cn(
                "p-4 border-t flex items-center justify-between",
                isDarkMode ? "border-slate-700" : "border-gray-200"
              )}>
                <div className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  {selectedShareTargets.length} selected
                </div>
                <button
                  onClick={() => shareStoryToChat(selectedShareTargets, shareActiveTab)}
                  disabled={selectedShareTargets.length === 0}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all",
                    selectedShareTargets.length === 0
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-emerald-500 text-white hover:bg-emerald-600"
                  )}
                >
                  <Send className="w-4 h-4" />
                  Share
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW: Audio Picker Modal for Adding Songs to Stories */}
      <AnimatePresence>
        {showAudioPicker && pendingStoryFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
            onClick={() => {
              setShowAudioPicker(false);
              setPendingStoryFile(null);
              setNewStoryAudioUrl('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "max-w-md w-full rounded-3xl p-6 shadow-2xl",
                isDarkMode ? "bg-slate-800" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Music2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                      Add Music
                    </h3>
                    <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Enhance your story with a song
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAudioPicker(false);
                    setPendingStoryFile(null);
                    setNewStoryAudioUrl('');
                  }}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                  )}
                >
                  <X className={cn("w-5 h-5", isDarkMode ? "text-slate-400" : "text-slate-500")} />
                </button>
              </div>

              {/* Preview of selected media */}
              <div className={cn(
                "rounded-2xl overflow-hidden mb-6 aspect-video relative",
                isDarkMode ? "bg-slate-700" : "bg-slate-100"
              )}>
                {pendingStoryFile.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(pendingStoryFile)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={URL.createObjectURL(pendingStoryFile)}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white text-sm font-medium truncate">
                    {pendingStoryFile.name}
                  </p>
                  <p className="text-white/70 text-xs">
                    {(pendingStoryFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {/* Audio Selection */}
              <div className="space-y-4">
                {!newStoryAudioUrl ? (
                  <>
                    <p className={cn("text-sm text-center", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Choose an audio file to add background music
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'audio/*';
                          input.onchange = (e: any) => {
                            const file = e.target.files?.[0];
                            if (file) addAudioToStory(file);
                          };
                          input.click();
                        }}
                        className={cn(
                          "p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center gap-2",
                          isDarkMode
                            ? "border-slate-600 hover:border-purple-500 bg-slate-700/50"
                            : "border-slate-300 hover:border-purple-500 bg-slate-50"
                        )}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <Music className="w-5 h-5 text-white" />
                        </div>
                        <span className={cn("text-sm font-medium", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                          Your Music
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          // Sample audio URLs for demo
                          const sampleAudios = [
                            'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                            'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
                            'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
                          ];
                          const randomAudio = sampleAudios[Math.floor(Math.random() * sampleAudios.length)];
                          setNewStoryAudioUrl(randomAudio);
                        }}
                        className={cn(
                          "p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center gap-2",
                          isDarkMode
                            ? "border-slate-600 hover:border-blue-500 bg-slate-700/50"
                            : "border-slate-300 hover:border-blue-500 bg-slate-50"
                        )}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                          <AudioLines className="w-5 h-5 text-white" />
                        </div>
                        <span className={cn("text-sm font-medium", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                          Sample Song
                        </span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={cn(
                    "p-4 rounded-2xl flex items-center gap-3",
                    isDarkMode ? "bg-purple-900/30" : "bg-purple-50"
                  )}>
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Music2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium truncate", isDarkMode ? "text-purple-300" : "text-purple-700")}>
                        Audio Added
                      </p>
                      <p className={cn("text-sm", isDarkMode ? "text-purple-400" : "text-purple-600")}>
                        Ready to post with music
                      </p>
                    </div>
                    <button
                      onClick={() => setNewStoryAudioUrl('')}
                      className={cn(
                        "p-2 rounded-full transition-colors",
                        isDarkMode ? "hover:bg-purple-800 text-purple-400" : "hover:bg-purple-200 text-purple-600"
                      )}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAudioPicker(false);
                    setPendingStoryFile(null);
                    setNewStoryAudioUrl('');
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
                    isDarkMode
                      ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAddStory}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {newStoryAudioUrl ? 'Post with Music' : 'Post Story'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoriesPage;
