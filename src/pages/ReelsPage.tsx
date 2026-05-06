
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Heart, Play, Pause, Plus, X, Music, TrendingUp, Send, MessageCircle, ThumbsUp, ChevronLeft, ChevronRight, Upload, Trash2, Edit3, Camera, Video, FileText, UserPlus, Volume2, VolumeX, Share2, MapPin, Hash, Menu, Sidebar, Bookmark, Download, Eye, Users, Clock, TrendingUp as TrendingUpIcon, Filter, Search, MoreVertical, Grid, List, ChevronDown, SkipForward, SkipBack, Loader2, Sparkles, Languages, Wand2, FileImage, Type, Globe, Check } from 'lucide-react';
import type { User, Reel } from '../types';
import Navbar from '../components/Navbar';
import UserProfileModal from '../components/UserProfileModal';

interface ReelsPageProps {
  isDarkMode?: boolean;
  user?: User;
  setUser?: (user: User) => void;
  toggleDarkMode?: () => void;
  socket?: any;
  socketConnected?: boolean;
}

const ReelsPage = ({ isDarkMode, user, setUser, toggleDarkMode, socket, socketConnected }: ReelsPageProps) => {
  const navigate = useNavigate();
  const [reels, setReels] = useState<Reel[]>([]);
  const [trendingReels, setTrendingReels] = useState<Reel[]>([]);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [newReelCaption, setNewReelCaption] = useState('');
  const [newReelMediaUrl, setNewReelMediaUrl] = useState('');
  const [newReelMediaType, setNewReelMediaType] = useState<'image' | 'video'>('image');
  const [newReelAudioUrl, setNewReelAudioUrl] = useState('');
  const [showReelComposer, setShowReelComposer] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [uploadMethod, setUploadMethod] = useState<'device' | 'title' | null>(null);
  const [newReelTitle, setNewReelTitle] = useState('');
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [friendRequests, setFriendRequests] = useState<string[]>([]); // Track sent requests
  const [chatContacts, setChatContacts] = useState<User[]>([]); // Chat contacts for sharing
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // View mode
  const [sortBy, setSortBy] = useState<'latest' | 'trending' | 'popular'>('latest'); // Sort option
  const [searchQuery, setSearchQuery] = useState(''); // Search functionality
  const [filters, setFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<'my-reels' | 'all-reels'>('my-reels');
  // Use reels-specific profile picture (separate from chat profile pic)
  const [profilePic, setProfilePic] = useState<string | null>(() => {
    if (user?.name) {
      return localStorage.getItem(`reels_profilePic_${user.name}`) || user?.pic || null;
    }
    return user?.pic || null;
  });
  const [viewingReel, setViewingReel] = useState<Reel | null>(null);
  const [viewingReelIndex, setViewingReelIndex] = useState<number>(0);
  const [isReelViewerOpen, setIsReelViewerOpen] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [likeAnimationPosition, setLikeAnimationPosition] = useState({ x: 0, y: 0 });
  const [savedReels, setSavedReels] = useState<string[]>(() => {
    const saved = localStorage.getItem('savedReels');
    return saved ? JSON.parse(saved) : [];
  });
  const [following, setFollowing] = useState<string[]>(() => {
    const followed = localStorage.getItem('following');
    return followed ? JSON.parse(followed) : [];
  });
  const [isLoadingReels, setIsLoadingReels] = useState(false);
  const [reelViewerMuted, setReelViewerMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reelViewerVideoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AI Feature States
  const [aiHashtags, setAiHashtags] = useState<string[]>([]);
  const [aiCaption, setAiCaption] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiTranslations, setAiTranslations] = useState<{[key: string]: string}>({});
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [selectedReelForAI, setSelectedReelForAI] = useState<Reel | null>(null);

  // Share Modal States
  const [showShareModal, setShowShareModal] = useState(false);
  const [reelToShare, setReelToShare] = useState<Reel | null>(null);
  const [selectedShareTargets, setSelectedShareTargets] = useState<string[]>([]);
  const [shareActiveTab, setShareActiveTab] = useState<'friends' | 'groups'>('friends');
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [groupsList, setGroupsList] = useState<any[]>([]);

  // User Profile Modal State
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showMyReels, setShowMyReels] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem('followingUsers');
    return saved ? JSON.parse(saved) : [];
  });
  const [followers, setFollowers] = useState<string[]>(() => {
    const saved = localStorage.getItem('followers');
    return saved ? JSON.parse(saved) : [];
  });
  const [followNotifications, setFollowNotifications] = useState<{from: User, timestamp: string}[]>([]);

  // Load user from localStorage if available (optional - reels are public)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!user && storedUser && setUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }, [navigate, setUser]);

  // Video refs for controlling playback
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const profileInputRef = useRef<HTMLInputElement>(null);

  // Computed reels to display (all reels or just my reels)
  const displayReels = useMemo(() => {
    if (showMyReels) {
      // Get my reels from localStorage or filter from reels
      const savedMyReels = localStorage.getItem('myReels');
      if (savedMyReels) {
        try {
          return JSON.parse(savedMyReels);
        } catch {
          return reels.filter(r => r.createdBy === user?._id || r.createdByName === user?.name);
        }
      }
      return reels.filter(r => r.createdBy === user?._id || r.createdByName === user?.name);
    }
    return reels;
  }, [showMyReels, reels, user]);

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfilePic(base64);
        if (setUser && user) {
          setUser({ ...user, pic: base64 });
        }
        // Store with reels-specific key
        localStorage.setItem(`reels_profilePic_${user?.name}`, base64);
        
        // Emit profile update event to update messages
        if (socket) {
          socket.emit('reels_profile_updated', {
            userId: user?._id,
            userName: user?.name,
            profilePic: base64
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePic = () => {
    setProfilePic(null);
    if (setUser && user) {
      setUser({ ...user, pic: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" });
    }
    localStorage.removeItem(`reels_profilePic_${user?.name}`);
    
    // Emit profile update event with default avatar
    if (socket) {
      socket.emit('reels_profile_updated', {
        userId: user?._id,
        userName: user?.name,
        profilePic: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"
      });
    }
  };

  // Mock songs data
  const popularSongs = [
    { id: '1', title: 'Trending Beat 1', artist: 'Artist 1', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: '2', title: 'Trending Beat 2', artist: 'Artist 2', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: '3', title: 'Trending Beat 3', artist: 'Artist 3', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  ];

  // Toggle video play/pause
  const toggleVideoPlay = (reelId: string) => {
    const video = videoRefs.current[reelId];
    if (video) {
      if (video.paused) {
        video.play().catch(err => console.log('Play error:', err));
        setIsPlaying(reelId);
      } else {
        video.pause();
        setIsPlaying(null);
      }
    }
  };

  // Toggle video mute/unmute
  const toggleVideoMute = (reelId: string) => {
    const video = videoRefs.current[reelId];
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted ? reelId : null);
    }
  };

  // Toggle audio play/pause
  const toggleAudioPlay = (songUrl: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(songUrl);
      audioRef.current.loop = true;
    }

    if (currentAudio === songUrl && isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      if (currentAudio !== songUrl) {
        audioRef.current.src = songUrl;
        audioRef.current.load();
      }
      audioRef.current.play();
      setCurrentAudio(songUrl);
      setIsAudioPlaying(true);
    }
  };

  // Stop audio
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
      setCurrentAudio(null);
    }
  };

  // Send friend request
  const sendFriendRequest = (creatorName: string) => {
    if (!friendRequests.includes(creatorName) && creatorName !== user?.name) {
      setFriendRequests(prev => [...prev, creatorName]);
      // Send to server
      socket?.emit('friend_request', {
        from: user?.name,
        to: creatorName
      });
      alert(`Friend request sent to ${creatorName}!`);
    }
  };

  // Open user profile modal
  const openUserProfile = (reel: Reel) => {
    const targetUser: User = {
      _id: reel.createdBy,
      name: reel.createdByName || 'Unknown User',
      email: `${reel.createdBy}@intellicall.com`,
      pic: `https://picsum.photos/seed/${reel.createdByName}/200/200`,
      isVerified: (reel.likes || []).length > 5, // Verified if popular
    };
    setSelectedUser(targetUser);
    setShowUserProfile(true);
  };

  // Handle follow user
  const handleFollowUser = (userId: string) => {
    setFollowingUsers(prev => {
      const newFollowing = prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      localStorage.setItem('followingUsers', JSON.stringify(newFollowing));
      return newFollowing;
    });
  };

  // Handle follow back
  const handleFollowBack = (userId: string) => {
    setFollowingUsers(prev => {
      if (!prev.includes(userId)) {
        const newFollowing = [...prev, userId];
        localStorage.setItem('followingUsers', JSON.stringify(newFollowing));
        // Send notification
        if (socket && user) {
          socket.emit('follow_notification', {
            from: user,
            to: userId,
            action: 'follow',
            timestamp: new Date().toISOString()
          });
        }
        return newFollowing;
      }
      return prev;
    });
  };

  // Navigate to chat with user
  const handleMessageUser = (targetUser: User) => {
    navigate('/chat', { state: { selectedUser: targetUser } });
  };

  // Fetch reels and online users
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load saved reels from localStorage (persist across refreshes)
        const savedReels = localStorage.getItem('userReels');
        let userReels: Reel[] = [];
        
        if (savedReels) {
          try {
            userReels = JSON.parse(savedReels);
            console.log(`📦 Loaded ${userReels.length} reels from localStorage`);
          } catch (e) {
            console.error("Error parsing saved reels:", e);
          }
        }

        // If no saved reels, use mock data
        if (userReels.length === 0) {
          userReels = [
            {
              _id: 'reel1',
              createdBy: user?._id || 'current',
              createdByName: user?.name || 'Current User',
              caption: 'My first reel! 🎬✨',
              mediaUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
              mediaType: 'video',
              createdAt: new Date().toISOString(),
              liked: false,
              likes: ['friend1', 'friend2'],
              comments: [
                { _id: 'c1', user: 'friend1', userName: 'Friend 1', text: 'Great start! 🎉', createdAt: new Date().toISOString() }
              ]
            },
            {
              _id: 'reel2',
              createdBy: user?._id || 'current',
              createdByName: user?.name || 'Current User',
              caption: 'Weekend vibes 🎉🎊',
              mediaUrl: 'https://picsum.photos/seed/weekend/400/600',
              mediaType: 'image',
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              liked: false,
              likes: ['friend3'],
              comments: []
            }
          ];
        }

        // Mock trending reels - Mix of videos and nature photos
        const mockTrendingReels: Reel[] = [
          {
            _id: 'trending1',
            createdBy: 'user1',
            createdByName: 'Nature Explorer',
            caption: 'Beautiful mountain view 🏔️✨',
            mediaUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
            mediaType: 'video',
            createdAt: new Date(Date.now() - 50000).toISOString(),
            liked: false,
            likes: ['user2', 'user3', 'user4', 'user5'],
            comments: [
              { _id: 'c1', user: 'user2', userName: 'User 2', text: 'Amazing! 🏔️', createdAt: new Date().toISOString() },
              { _id: 'c2', user: 'user3', userName: 'User 3', text: 'Where is this?', createdAt: new Date().toISOString() }
            ]
          },
          {
            _id: 'trending2',
            createdBy: 'user2',
            createdByName: 'Food Lover',
            caption: 'Delicious food 🍕🍔',
            mediaUrl: 'https://picsum.photos/seed/food/400/600',
            mediaType: 'image',
            createdAt: new Date(Date.now() - 40000).toISOString(),
            liked: false,
            likes: ['user1', 'user5'],
            comments: [
              { _id: 'c3', user: 'user1', userName: 'User 1', text: 'Yummy! 😋', createdAt: new Date().toISOString() }
            ]
          },
          {
            _id: 'trending3',
            createdBy: 'user3',
            createdByName: 'Ocean Vibes',
            caption: 'Ocean waves 🌊🐚',
            mediaUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_1s_1MB.mp4',
            mediaType: 'video',
            createdAt: new Date(Date.now() - 35000).toISOString(),
            liked: false,
            likes: ['user1', 'user2', 'user6'],
            comments: [
              { _id: 'c4', user: 'user1', userName: 'User 1', text: 'So relaxing! 🌊', createdAt: new Date().toISOString() }
            ]
          },
          {
            _id: 'trending4',
            createdBy: 'user4',
            createdByName: 'Forest Walker',
            caption: 'Morning in the forest 🌲🍃',
            mediaUrl: 'https://picsum.photos/seed/forest/400/600',
            mediaType: 'image',
            createdAt: new Date(Date.now() - 30000).toISOString(),
            liked: false,
            likes: ['user2', 'user5', 'user7'],
            comments: []
          },
          {
            _id: 'trending5',
            createdBy: 'user5',
            createdByName: 'Sunset Chaser',
            caption: 'Golden sunset 🌅✨',
            mediaUrl: 'https://picsum.photos/seed/sunset/400/600',
            mediaType: 'image',
            createdAt: new Date(Date.now() - 20000).toISOString(),
            liked: false,
            likes: ['user1', 'user3', 'user4', 'user6'],
            comments: [
              { _id: 'c5', user: 'user3', userName: 'User 3', text: 'Beautiful colors! 🌅', createdAt: new Date().toISOString() }
            ]
          },
          {
            _id: 'trending6',
            createdBy: 'user6',
            createdByName: 'Travel Diaries',
            caption: 'City lights at night 🌃✨',
            mediaUrl: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
            mediaType: 'video',
            createdAt: new Date(Date.now() - 15000).toISOString(),
            liked: false,
            likes: ['user2', 'user4', 'user5'],
            comments: []
          }
        ];

        // Mock online users - Reduced
        const mockOnlineUsers = [
          { _id: '1', name: 'Alice', email: 'alice@example.com', pic: 'https://picsum.photos/seed/alice/200/200', isVerified: false }
        ];

        // Load friends from localStorage (set in ChatPage)
        let friendsList: any[] = [];
        const storedFriends = localStorage.getItem('friends');
        if (storedFriends) {
          try {
            const parsed = JSON.parse(storedFriends);
            friendsList = parsed.map((f: any) => ({
              _id: f._id || f.id || Math.random().toString(36).substr(2, 9),
              name: f.name,
              email: f.email || '',
              pic: f.pic || f.profilePic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg',
              isOnline: f.isOnline || false,
              isVerified: f.isVerified || false
            }));
          } catch (e) {
            console.error('Error parsing friends:', e);
          }
        }

        // Load groups from localStorage (set in ChatPage)
        let groups: any[] = [];
        const storedGroups = localStorage.getItem('userGroups');
        if (storedGroups) {
          try {
            groups = JSON.parse(storedGroups);
          } catch (e) {
            console.error('Error parsing groups:', e);
          }
        }

        // Mock chat contacts for sharing (fallback if no friends in localStorage)
        const mockChatContacts = friendsList.length > 0 ? friendsList : [
          { _id: '1', name: 'Alice', email: 'alice@example.com', pic: 'https://picsum.photos/seed/alice/200/200', isOnline: true, isVerified: false },
          { _id: '2', name: 'Bob', email: 'bob@example.com', pic: 'https://picsum.photos/seed/bob/200/200', isOnline: true, isVerified: true },
          { _id: '3', name: 'Charlie', email: 'charlie@example.com', pic: 'https://picsum.photos/seed/charlie/200/200', isOnline: false, isVerified: false },
          { _id: '4', name: 'Diana', email: 'diana@example.com', pic: 'https://picsum.photos/seed/diana/200/200', isOnline: true, isVerified: true }
        ];

        // Combine all reels - include user reels with trending reels
        const otherReels = mockTrendingReels.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        
        // Store user reels separately
        const myReelsList = userReels;
        
        // Combine user reels + other reels for main display
        const allReels = [...myReelsList, ...otherReels].sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        
        setTrendingReels(mockTrendingReels);
        setReels(allReels);
        // Store my reels in localStorage for access
        localStorage.setItem('myReels', JSON.stringify(myReelsList));
        setOnlineUsers(mockOnlineUsers);
        setChatContacts(mockChatContacts);
        setGroupsList(groups);
      } catch (error) {
        console.error('Error fetching reels:', error);
      }
    };

    fetchData();
  }, [user]);

  // Save only user reels to localStorage whenever they change
  useEffect(() => {
    if (reels.length > 0 && user) {
      const userReelsOnly = reels.filter(r => r.createdBy === user._id || r.createdByName === user.name);
      localStorage.setItem('userReels', JSON.stringify(userReelsOnly));
      localStorage.setItem('myReels', JSON.stringify(userReelsOnly));
    }
  }, [reels, user]);

  // Socket effects
  useEffect(() => {
    if (!socket) return;

    // Emit setup when component mounts to maintain online status
    if (user && user._id) {
      socket.emit('setup', { _id: user._id, name: user.name, pic: user.pic, email: user.email });
      console.log('📡 ReelsPage: Emitted setup for', user.name);
    }

    // Listen for online users
    socket.on('users_online', (users: User[]) => {
      setOnlineUsers(users);
    });

    // Listen for online status updates from server
    socket.on('user_status_change', (updatedUsers: any[]) => {
      console.log('📥 ReelsPage: Received user_status_change', updatedUsers);
      // Update online status in onlineUsers state
      setOnlineUsers(prev => {
        const onlineMap = new Map(updatedUsers.map(u => [u._id, u.isOnline]));
        return prev.map(u => ({
          ...u,
          isOnline: onlineMap.get(u._id) ?? u.isOnline
        }));
      });
    });

    // Listen for reel likes from other users
    socket.on('reel_like', (data: { reelId: string; user: string; action: string }) => {
      // Update both trending and regular reels
      setTrendingReels(prev => prev.map(reel => {
        if (reel._id === data.reelId) {
          const isLiked = data.action === 'like';
          return {
            ...reel,
            liked: isLiked,
            likes: isLiked 
              ? [...(reel.likes || []), data.user]
              : reel.likes?.filter(name => name !== data.user) || []
          };
        }
        return reel;
      }));

      setReels(prev => prev.map(reel => {
        if (reel._id === data.reelId) {
          const isLiked = data.action === 'like';
          return {
            ...reel,
            liked: isLiked,
            likes: isLiked 
              ? [...(reel.likes || []), data.user]
              : reel.likes?.filter(name => name !== data.user) || []
          };
        }
        return reel;
      }));
    });

    // Listen for new comments from other users
    socket.on('reel_comment', (data: { reelId: string; comment: any }) => {
      // Update both trending and regular reels
      setTrendingReels(prev => prev.map(reel => {
        if (reel._id === data.reelId) {
          return {
            ...reel,
            comments: [...(reel.comments || []), data.comment]
          };
        }
        return reel;
      }));

      setReels(prev => prev.map(reel => {
        if (reel._id === data.reelId) {
          return {
            ...reel,
            comments: [...(reel.comments || []), data.comment]
          };
        }
        return reel;
      }));
    });

    // Listen for new reels from other users
    socket.on('new_reel', (reel: Reel) => {
      setReels(prev => [reel, ...prev].sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      ));
    });

    // Listen for reel deletions from other users
    socket.on('reel_deleted', (data: { reelId: string; userId: string }) => {
      setReels(prev => prev.filter(reel => reel._id !== data.reelId));
      setTrendingReels(prev => prev.filter(reel => reel._id !== data.reelId));
    });

    // Listen for friend requests
    socket.on('friend_request_received', (data: { from: string; to: string }) => {
      if (data.to === user?.name) {
        alert(`Friend request from ${data.from}! 👋`);
      }
    });

    // Listen for shared reels
    socket.on('reel_shared', (data: { from: string; reelId: string; caption: string }) => {
      console.log(`Reel shared: ${data.from} shared reel ${data.reelId}`);
    });

    // Listen for follow notifications
    socket.on('follow_notification', (data: { from: User; action: 'follow' | 'unfollow'; timestamp: string }) => {
      if (data.action === 'follow') {
        setFollowers(prev => {
          if (!prev.includes(data.from._id)) {
            const newFollowers = [...prev, data.from._id];
            localStorage.setItem('followers', JSON.stringify(newFollowers));
            return newFollowers;
          }
          return prev;
        });
        // Add to notifications
        setFollowNotifications(prev => [...prev, { from: data.from, timestamp: data.timestamp }]);
        // Show toast notification
        alert(`${data.from.name} started following you! 🎉`);
      } else {
        setFollowers(prev => {
          const newFollowers = prev.filter(id => id !== data.from._id);
          localStorage.setItem('followers', JSON.stringify(newFollowers));
          return newFollowers;
        });
      }
    });

    // Listen for reel sharing confirmation
    socket.on('reel_shared_confirmation', (data: { reelId: string; friendsCount: number; groupsCount: number; message: string }) => {
      console.log('Reel share confirmation:', data);
      // You could show a toast notification here
    });

    // Listen for sharing errors
    socket.on('share_error', (data: { error: string; details: string }) => {
      console.error('Share error:', data);
      alert(`Error sharing reel: ${data.error}`);
    });

    return () => {
      // Don't disconnect socket here - it's managed by App.tsx
      // Just clean up event listeners
      socket?.off('users_online');
      socket?.off('user_status_change');
      socket?.off('reel_like');
      socket?.off('reel_comment');
      socket?.off('new_reel');
      socket?.off('reel_deleted');
      socket?.off('friend_request_received');
      socket?.off('reel_shared');
      socket?.off('follow_notification');
      socket?.off('reel_shared_confirmation');
      socket?.off('share_error');
    };
  }, [socket, user]);

  // Toggle like
  const toggleLike = (reelId: string, isTrending: boolean = false) => {
    console.log('toggleLike called:', reelId, isTrending); // Debug log
    const targetArray = isTrending ? trendingReels : reels;
    const setter = isTrending ? setTrendingReels : setReels;
    
    // Find the current reel to check its state
    const currentReel = targetArray.find(r => r._id === reelId);
    if (!currentReel) return;

    setter(prev => prev.map(reel => {
      if (reel._id === reelId) {
        const isLiked = reel.liked || false;
        const newLikes = isLiked 
          ? reel.likes?.filter(name => name !== user?.name) || []
          : [...(reel.likes || []), user?.name || ''];
        
        return {
          ...reel,
          liked: !isLiked,
          likes: newLikes
        };
      }
      return reel;
    }));

    // Send to server with correct action
    socket?.emit('reel_like', {
      reelId,
      user: user?.name,
      action: currentReel.liked ? 'unlike' : 'like'
    });
  };

  // Add reel
  const addReel = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newReel: Reel = {
        _id: Math.random().toString(36).substr(2, 9),
        createdBy: user?._id || 'current',
        createdByName: user?.name || 'Current User',
        caption: newReelCaption,
        mediaUrl: reader.result as string,
        mediaType: file.type.startsWith('image/') ? 'image' : 'video',
        audioUrl: newReelAudioUrl || undefined,
        createdAt: new Date().toISOString(),
        liked: false,
        likes: [],
        comments: []
      };
      
      // Update local state
      setReels(prev => [newReel, ...prev]);
      
      // Emit to socket for real-time sync
      socket?.emit('new_reel', newReel);
      
      // Reset form
      setNewReelCaption('');
      setNewReelMediaUrl('');
      setNewReelAudioUrl('');
      setNewReelMediaType('image');
      setShowCreateModal(false);
    };
    reader.readAsDataURL(file);
  };

  // Add audio to reel
  const addAudioToReel = (audioFile: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewReelAudioUrl(reader.result as string);
    };
    reader.readAsDataURL(audioFile);
  };

  // Delete reel
  const deleteReel = (reelId: string) => {
    // Update local state - useEffect will handle localStorage update
    setReels(prev => prev.filter(reel => reel._id !== reelId));
    
    // Also remove from trending if it exists there
    setTrendingReels(prev => prev.filter(reel => reel._id !== reelId));
    
    // Emit to socket for real-time sync
    socket?.emit('delete_reel', {
      reelId,
      userId: user?._id
    });
    
    if (currentReelIndex >= reels.length - 1 && currentReelIndex > 0) {
      setCurrentReelIndex(prev => prev - 1);
    }
  };

  // Add comment
  const addComment = (reelId: string, isTrending: boolean = false) => {
    if (!commentText.trim()) return;
    
    const newComment = {
      _id: Math.random().toString(36).substr(2, 9),
      user: user?._id || 'current',
      userName: user?.name || 'Current User',
      text: commentText,
      createdAt: new Date().toISOString()
    };
    
    // Update both regular and trending reels
    setReels(prev => prev.map(reel => {
      if (reel._id === reelId) {
        return {
          ...reel,
          comments: [...(reel.comments || []), newComment]
        };
      }
      return reel;
    }));
    
    setTrendingReels(prev => prev.map(reel => {
      if (reel._id === reelId) {
        return {
          ...reel,
          comments: [...(reel.comments || []), newComment]
        };
      }
      return reel;
    }));
    
    // Send to server
    socket?.emit('reel_comment', {
      reelId,
      comment: newComment
    });
    
    setCommentText('');
  };

  // Open share modal for reel
  const shareReel = (reel: Reel) => {
    setReelToShare(reel);
    setShowShareModal(true);
    setSelectedShareTargets([]);
    setShareActiveTab('friends');
    setShareSearchQuery('');
  };

  // Actually share reel to selected friends/groups via socket
  const handleShareReelToTargets = () => {
    if (!reelToShare || selectedShareTargets.length === 0 || !socket || !user) {
      alert('Please select at least one friend or group to share with');
      return;
    }

    const currentUser = user || {
      _id: 'guest_user',
      name: 'Guest User',
      email: 'guest@intellicall.com',
      pic: 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'
    };

    // Separate friends and groups
    const friendTargets: string[] = [];
    const groupTargets: string[] = [];

    selectedShareTargets.forEach(targetId => {
      // Check if it's a group (groups usually have different ID pattern or check groupsList)
      const isGroup = groupsList.some(g => g._id === targetId);
      if (isGroup) {
        groupTargets.push(targetId);
      } else {
        friendTargets.push(targetId);
      }
    });

    // Emit socket event to share reel
    socket.emit('share_reel_to_friends_and_groups', {
      from: currentUser.name,
      fromId: currentUser._id,
      reelId: reelToShare._id,
      caption: reelToShare.caption || 'Shared Reel',
      mediaUrl: reelToShare.mediaUrl,
      mediaType: reelToShare.mediaType || 'video',
      friends: friendTargets,
      groups: groupTargets
    });

    // Add shared reel to sender's reels list so they can see it in their feed
    const sharedReel = {
      ...reelToShare,
      _id: `${reelToShare._id}_shared_${Date.now()}`, // Create unique ID for shared copy
      createdBy: currentUser._id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
      isShared: true,
      sharedToCount: friendTargets.length + groupTargets.length,
      likes: reelToShare.likes || [],
      comments: reelToShare.comments || [],
      liked: false
    } as Reel & { isShared?: boolean; sharedToCount?: number };

    // Update reels state to include the shared reel at the top
    setReels(prev => [sharedReel, ...prev]);

    // Also store in session for immediate navigation
    sessionStorage.setItem('pendingSharedReel', JSON.stringify({
      reel: reelToShare,
      from: currentUser.name,
      fromId: currentUser._id,
      timestamp: new Date().toISOString(),
      sharedTo: selectedShareTargets
    }));

    // Show success notification
    const totalTargets = friendTargets.length + groupTargets.length;
    alert(`Reel shared with ${totalTargets} recipient${totalTargets > 1 ? 's' : ''}!`);

    // Close modal
    setShowShareModal(false);
    setReelToShare(null);
    setSelectedShareTargets([]);

    // Navigate to chat if only one friend selected
    if (friendTargets.length === 1 && groupTargets.length === 0) {
      const friend = chatContacts.find(f => f._id === friendTargets[0]);
      if (friend) {
        navigate('/chat', { state: { selectedUser: { name: friend.name, _id: friend._id, pic: friend.pic } } });
      }
    }
  };

  // Navigate reels
  const nextReel = () => {
    setCurrentReelIndex(prev => (prev + 1) % displayReels.length);
  };

  const prevReel = () => {
    setCurrentReelIndex(prev => (prev - 1 + displayReels.length) % displayReels.length);
  };

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentReelIndex < displayReels.length - 1) {
      nextReel();
    }
    if (isRightSwipe && currentReelIndex > 0) {
      prevReel();
    }
  };

  // Enhanced Reel Viewer Functions
  const openReelViewer = (reel: Reel, index: number) => {
    setViewingReel(reel);
    setViewingReelIndex(index);
    setIsReelViewerOpen(true);
    setVideoProgress(0);
    document.body.style.overflow = 'hidden';
  };

  const closeReelViewer = () => {
    setIsReelViewerOpen(false);
    setViewingReel(null);
    setVideoProgress(0);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    document.body.style.overflow = '';
  };

  const navigateReelViewer = (direction: 'next' | 'prev') => {
    const allReels = [...reels, ...trendingReels];
    let newIndex = direction === 'next' ? viewingReelIndex + 1 : viewingReelIndex - 1;

    if (newIndex < 0) newIndex = allReels.length - 1;
    if (newIndex >= allReels.length) newIndex = 0;

    setViewingReelIndex(newIndex);
    setViewingReel(allReels[newIndex]);
    setVideoProgress(0);
  };

  const handleDoubleTapLike = (e: React.MouseEvent, reel: Reel) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setLikeAnimationPosition({ x, y });
    setShowLikeAnimation(true);

    // Trigger like
    if (!reel.liked) {
      toggleLike(reel._id, false);
    }

    setTimeout(() => setShowLikeAnimation(false), 1000);
  };

  const toggleSaveReel = (reelId: string) => {
    setSavedReels(prev => {
      const newSaved = prev.includes(reelId)
        ? prev.filter(id => id !== reelId)
        : [...prev, reelId];
      localStorage.setItem('savedReels', JSON.stringify(newSaved));
      return newSaved;
    });
  };

  const toggleFollow = (creatorName: string) => {
    setFollowing(prev => {
      const newFollowing = prev.includes(creatorName)
        ? prev.filter(name => name !== creatorName)
        : [...prev, creatorName];
      localStorage.setItem('following', JSON.stringify(newFollowing));
      return newFollowing;
    });
  };

  const updateVideoProgress = () => {
    if (reelViewerVideoRef.current) {
      const video = reelViewerVideoRef.current;
      const progress = (video.currentTime / video.duration) * 100;
      setVideoProgress(progress);
    }
  };

  const handleVideoEnded = () => {
    // Auto play next reel
    navigateReelViewer('next');
  };

  // Loading skeleton component
  const ReelSkeleton = () => (
    <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-slate-200 dark:bg-slate-800 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-300/50 dark:to-slate-700/50" />
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded w-1/2" />
      </div>
    </div>
  );

  // AI Feature Functions
  const generateAutoCaption = async () => {
    if (!newReelMediaUrl) return;
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/reels/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: newReelMediaUrl,
          mediaType: newReelMediaType,
          context: newReelCaption
        })
      });
      const data = await response.json();
      if (data.caption) {
        setAiCaption(data.caption);
        setNewReelCaption(data.caption);
      }
    } catch (error) {
      console.error('Auto caption error:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateHashtags = async () => {
    const captionToUse = newReelCaption || 'Reel content';
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/reels/ai/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: captionToUse,
          mediaType: newReelMediaType
        })
      });
      const data = await response.json();
      if (data.hashtags) {
        setAiHashtags(data.hashtags);
      }
    } catch (error) {
      console.error('Hashtag generation error:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const translateCaption = async () => {
    if (!newReelCaption) return;
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/reels/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: newReelCaption,
          targetLanguages: [selectedLanguage, 'es', 'fr', 'hi']
        })
      });
      const data = await response.json();
      if (data.translations) {
        setAiTranslations(data.translations);
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateSummary = async (reel?: Reel) => {
    const targetReel = reel || selectedReelForAI;
    if (!targetReel) return;
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/reels/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: targetReel.caption,
          mediaType: targetReel.mediaType
        })
      });
      const data = await response.json();
      if (data.summary) {
        setAiSummary(data.summary);
        setShowSummaryModal(true);
      }
    } catch (error) {
      console.error('Summary generation error:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const processAllAIFeatures = async () => {
    if (!newReelMediaUrl) return;
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/reels/ai/process-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: newReelCaption,
          mediaUrl: newReelMediaUrl,
          mediaType: newReelMediaType
        })
      });
      const data = await response.json();
      if (data.aiResults) {
        if (data.aiResults.autoCaption) {
          setAiCaption(data.aiResults.autoCaption);
          setNewReelCaption(data.aiResults.autoCaption);
        }
        if (data.aiResults.hashtags) setAiHashtags(data.aiResults.hashtags);
        if (data.aiResults.summary) setAiSummary(data.aiResults.summary);
      }
    } catch (error) {
      console.error('AI processing error:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateVideoThumbnail = () => {
    if (!newReelMediaUrl || newReelMediaType !== 'video') return;
    const video = document.createElement('video');
    video.src = newReelMediaUrl;
    video.crossOrigin = 'anonymous';
    video.currentTime = 1; // Capture at 1 second
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        setGeneratedThumbnail(thumbnail);
        setShowThumbnailModal(true);
      }
    };
  };

  const languageNames: {[key: string]: string} = {
    es: 'Spanish',
    fr: 'French',
    hi: 'Hindi',
    ar: 'Arabic',
    de: 'German',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
    ru: 'Russian',
    pt: 'Portuguese'
  };

  return (
    <div className={cn("min-h-screen selection:bg-emerald-100", isDarkMode ? "bg-slate-950" : "bg-white")}>
      <Navbar 
        user={user} 
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        onlineCount={onlineUsers.length}
        onProfileClick={() => setShowProfile(!showProfile)}
        socketConnected={socketConnected ?? socket?.connected ?? false}
      />
      
      <div className="flex">
      {/* Sidebar Toggle Button - Show when sidebar is closed */}
      <AnimatePresence>
        {!showSidebar && (
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            onClick={() => setShowSidebar(true)}
            className={cn(
              "fixed left-4 top-24 z-40 p-3 rounded-full shadow-lg transition-all",
              isDarkMode
                ? "bg-slate-800 text-white hover:bg-slate-700 shadow-slate-950/50"
                : "bg-white text-slate-700 hover:bg-slate-100 shadow-slate-300/50"
            )}
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Profile Button - Shows when sidebar is open */}
      <AnimatePresence>
        {showSidebar && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setShowProfile(true)}
            className={cn(
              "fixed left-[400px] top-24 z-40 p-2 rounded-full shadow-lg transition-all border-2",
              isDarkMode
                ? "bg-slate-800 border-slate-700 hover:bg-slate-700 shadow-slate-950/50"
                : "bg-white border-slate-200 hover:bg-slate-50 shadow-slate-300/50"
            )}
          >
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                isDarkMode ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-700"
              )}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -384 }}
            animate={{ x: 0 }}
            exit={{ x: -384 }}
            className={cn("w-96 max-w-[100vw] border-r overflow-y-auto", isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}
            style={{ height: '210vh' }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                  Create Reel
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100")}
                >
                  <X className={cn("w-4 h-4", isDarkMode ? "text-slate-400" : "text-slate-600")} />
                </button>
              </div>

              {/* Upload Options */}
              <div className="space-y-4">
                <div>
                  <h3 className={cn("text-sm font-medium mb-3", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                    How would you like to create?
                  </h3>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => setUploadMethod('device')}
                      className={cn(
                        "w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-3",
                        uploadMethod === 'device'
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      )}
                    >
                      <Upload className={cn("w-5 h-5", uploadMethod === 'device' ? "text-emerald-500" : isDarkMode ? "text-slate-400" : "text-slate-600")} />
                      <div className="text-left">
                        <p className={cn("font-medium", isDarkMode ? "text-white" : "text-slate-900")}>
                          Select from Device
                        </p>
                        <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          Upload photo or video
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => setUploadMethod('title')}
                      className={cn(
                        "w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-3",
                        uploadMethod === 'title'
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      )}
                    >
                      <FileText className={cn("w-5 h-5", uploadMethod === 'title' ? "text-emerald-500" : isDarkMode ? "text-slate-400" : "text-slate-600")} />
                      <div className="text-left">
                        <p className={cn("font-medium", isDarkMode ? "text-white" : "text-slate-900")}>
                          Create with Title
                        </p>
                        <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          Add text overlay
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Upload Form */}
                {uploadMethod === 'device' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700"
                  >
                    <div>
                      <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                        Caption
                      </label>
                      <input
                        type="text"
                        value={newReelCaption}
                        onChange={(e) => setNewReelCaption(e.target.value)}
                        placeholder="Write a caption..."
                        className={cn(
                          "w-full px-4 py-3 rounded-2xl border outline-none transition-all",
                          isDarkMode 
                            ? "bg-slate-800 border-slate-700 text-white focus:border-emerald-500/50" 
                            : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500/50"
                        )}
                      />
                    </div>

                    <div>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Check file size (max 50MB)
                            if (file.size > 50 * 1024 * 1024) {
                              alert('File size must be less than 50MB');
                              return;
                            }
                            setNewReelMediaType(file.type.startsWith('image/') ? 'image' : 'video');
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const result = reader.result as string;
                              setNewReelMediaUrl(result);
                              console.log('File loaded successfully:', file.type, file.size);
                            };
                            reader.onerror = () => {
                              alert('Error loading file. Please try again.');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="sidebar-upload"
                      />
                      <label
                        htmlFor="sidebar-upload"
                        className={cn(
                          "w-full px-4 py-3 rounded-2xl font-medium text-sm border transition-all cursor-pointer flex items-center justify-center gap-2",
                          isDarkMode 
                            ? "bg-emerald-500 text-white border-emerald-500/30 hover:bg-emerald-600" 
                            : "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                        )}
                      >
                        <Upload className="w-4 h-4" />
                        Choose File
                      </label>
                    </div>

                    {newReelMediaUrl && (
                      <div className="space-y-2">
                        {newReelMediaType === 'video' ? (
                          <video
                            src={newReelMediaUrl}
                            className="w-full h-32 object-cover rounded-2xl"
                            controls
                          />
                        ) : (
                          <img
                            src={newReelMediaUrl}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-2xl"
                          />
                        )}

                        {/* AI Tools Section */}
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <span className={cn("text-xs font-medium", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                              AI Tools
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {/* Auto Caption */}
                            <button
                              onClick={generateAutoCaption}
                              disabled={isGeneratingAI}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                                isDarkMode
                                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              )}
                            >
                              {isGeneratingAI ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Type className="w-3 h-3" />
                              )}
                              Auto Caption
                            </button>

                            {/* Hashtags */}
                            <button
                              onClick={generateHashtags}
                              disabled={isGeneratingAI}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                                isDarkMode
                                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              )}
                            >
                              {isGeneratingAI ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Hash className="w-3 h-3" />
                              )}
                              Hashtags
                            </button>

                            {/* Thumbnail Generator (for video only) */}
                            {newReelMediaType === 'video' && (
                              <button
                                onClick={generateVideoThumbnail}
                                disabled={isGeneratingAI}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                                  isDarkMode
                                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                )}
                              >
                                <FileImage className="w-3 h-3" />
                                Thumbnail
                              </button>
                            )}

                            {/* Translate */}
                            <button
                              onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                              disabled={isGeneratingAI || !newReelCaption}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                                isDarkMode
                                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700",
                                !newReelCaption && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <Languages className="w-3 h-3" />
                              Translate
                            </button>

                            {/* Process All AI */}
                            <button
                              onClick={processAllAIFeatures}
                              disabled={isGeneratingAI}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all col-span-2",
                                "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                              )}
                            >
                              {isGeneratingAI ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Wand2 className="w-3 h-3" />
                              )}
                              {isGeneratingAI ? 'Generating...' : 'AI Magic - All Features'}
                            </button>
                          </div>

                          {/* AI Generated Results Display */}
                          {aiHashtags.length > 0 && (
                            <div className="mb-3">
                              <p className={cn("text-xs mb-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                AI Suggested Hashtags:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {aiHashtags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    onClick={() => setNewReelCaption(prev => prev + ' #' + tag)}
                                    className="px-2 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-xs cursor-pointer hover:bg-purple-500/30 transition-colors"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Language Selector */}
                          {showLanguageSelector && (
                            <div className="mb-3 p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                              <p className={cn("text-xs mb-2", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Select language:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(languageNames).map(([code, name]) => (
                                  <button
                                    key={code}
                                    onClick={() => {
                                      setSelectedLanguage(code);
                                      translateCaption();
                                      setShowLanguageSelector(false);
                                    }}
                                    className={cn(
                                      "px-2 py-1 rounded-lg text-xs transition-all",
                                      selectedLanguage === code
                                        ? "bg-emerald-500 text-white"
                                        : isDarkMode
                                          ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                          : "bg-white text-slate-600 hover:bg-slate-200"
                                    )}
                                  >
                                    {name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* AI Translations Display */}
                          {Object.keys(aiTranslations).length > 0 && (
                            <div className="mb-3 p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                              <p className={cn("text-xs mb-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Translations:
                              </p>
                              {Object.entries(aiTranslations).slice(0, 2).map(([lang, translation]) => (
                                <div key={lang} className="flex items-center gap-2 text-xs mb-1">
                                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded">
                                    {languageNames[lang]}
                                  </span>
                                  <span className={cn("flex-1 truncate", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                                    {translation}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (newReelCaption.trim() && newReelMediaUrl) {
                              const input = document.getElementById('sidebar-upload') as HTMLInputElement;
                              const file = input.files?.[0];
                              if (file) {
                                console.log('Posting reel:', file.name, newReelMediaType);
                                addReel(file);
                              } else {
                                // Handle case where file was already processed
                                const mockFile = new File([''], 'reel.' + (newReelMediaType === 'video' ? 'mp4' : 'jpg'), {
                                  type: newReelMediaType === 'video' ? 'video/mp4' : 'image/jpeg'
                                });
                                addReel(mockFile);
                              }
                            }
                          }}
                          disabled={!newReelCaption.trim() || !newReelMediaUrl}
                          className={cn(
                            "w-full py-3 rounded-2xl font-medium text-sm transition-all",
                            !newReelCaption.trim() || !newReelMediaUrl
                              ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                              : "bg-emerald-500 text-white hover:bg-emerald-600"
                          )}
                        >
                          Post Reel
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {uploadMethod === 'title' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700"
                  >
                    <div>
                      <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                        Title Text
                      </label>
                      <input
                        type="text"
                        value={newReelTitle}
                        onChange={(e) => setNewReelTitle(e.target.value)}
                        placeholder="Enter title text..."
                        className={cn(
                          "w-full px-4 py-3 rounded-2xl border outline-none transition-all",
                          isDarkMode 
                            ? "bg-slate-800 border-slate-700 text-white focus:border-emerald-500/50" 
                            : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500/50"
                        )}
                      />
                    </div>

                    <div>
                      <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                        Caption
                      </label>
                      <input
                        type="text"
                        value={newReelCaption}
                        onChange={(e) => setNewReelCaption(e.target.value)}
                        placeholder="Write a caption..."
                        className={cn(
                          "w-full px-4 py-3 rounded-2xl border outline-none transition-all",
                          isDarkMode 
                            ? "bg-slate-800 border-slate-700 text-white focus:border-emerald-500/50" 
                            : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500/50"
                        )}
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (newReelTitle.trim() && newReelCaption.trim()) {
                          const newReel: Reel = {
                            _id: Math.random().toString(36).substr(2, 9),
                            createdBy: user?._id || 'current',
                            createdByName: user?.name || 'Current User',
                            caption: newReelCaption,
                            mediaUrl: `https://picsum.photos/seed/${newReelTitle}/400/600`,
                            mediaType: 'image',
                            createdAt: new Date().toISOString(),
                            liked: false,
                            likes: [],
                            comments: []
                          };
                          setReels(prev => [newReel, ...prev]);
                          setNewReelTitle('');
                          setNewReelCaption('');
                          setUploadMethod(null);
                        }
                      }}
                      disabled={!newReelTitle.trim() || !newReelCaption.trim()}
                      className={cn(
                        "w-full py-3 rounded-2xl font-medium text-sm transition-all",
                        !newReelTitle.trim() || !newReelCaption.trim()
                          ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed" 
                          : "bg-emerald-500 text-white hover:bg-emerald-600"
                      )}
                    >
                      Create Text Reel
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                <h3 className={cn("text-sm font-medium mb-4", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  Your Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn("p-4 rounded-2xl", isDarkMode ? "bg-slate-800" : "bg-slate-50")}>
                    <p className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                      {reels.length}
                    </p>
                    <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Total Reels
                    </p>
                  </div>
                  <div className={cn("p-4 rounded-2xl", isDarkMode ? "bg-slate-800" : "bg-slate-50")}>
                    <p className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                      {reels.reduce((acc, reel) => acc + (reel.likes?.length || 0), 0)}
                    </p>
                    <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Total Likes
                    </p>
                  </div>
                </div>
              </div>

              {/* Music Picker */}
              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                <h3 className={cn("text-sm font-medium mb-4", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  🎵 Trending Music
                </h3>
                <div className="space-y-2">
                  {popularSongs.map((song) => (
                    <div
                      key={song.id}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3",
                        currentAudio === song.url && isAudioPlaying
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      )}
                      onClick={() => toggleAudioPlay(song.url)}
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", 
                        currentAudio === song.url && isAudioPlaying
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600"
                      )}>
                        {currentAudio === song.url && isAudioPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                          {song.title}
                        </p>
                        <p className={cn("text-xs truncate", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          {song.artist}
                        </p>
                      </div>
                      {currentAudio === song.url && isAudioPlaying && (
                        <div className="flex gap-1">
                          <div className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                          <div className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse delay-75"></div>
                          <div className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse delay-150"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {isAudioPlaying && (
                  <button
                    onClick={stopAudio}
                    className="mt-3 w-full py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    Stop Music
                  </button>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                <h3 className={cn("text-sm font-medium mb-4", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  ⚡ Quick Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                        .then(stream => {
                          alert('Camera access granted! 📸 Ready to record.');
                          stream.getTracks().forEach(track => track.stop());
                        })
                        .catch(err => alert('Camera access denied.'));
                    }}
                    className={cn("w-full p-3 rounded-xl border transition-all flex items-center gap-3", isDarkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50")}
                  >
                    <Camera className="w-4 h-4" />
                    <span className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-slate-900")}>Quick Camera</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(() => {
                          alert('Location added to reel! 📍');
                        });
                      }
                    }}
                    className={cn("w-full p-3 rounded-xl border transition-all flex items-center gap-3", isDarkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50")}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-slate-900")}>Add Location</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      const hashtags = ['#reels', '#trending', '#viral', '#dance', '#music'];
                      alert(`Popular hashtags: ${hashtags.join(', ')}`);
                    }}
                    className={cn("w-full p-3 rounded-xl border transition-all flex items-center gap-3", isDarkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50")}
                  >
                    <Hash className="w-4 h-4" />
                    <span className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-slate-900")}>Trending Hashtags</span>
                  </button>
                </div>
              </div>

              {/* Reel Settings */}
              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                <h3 className={cn("text-sm font-medium mb-4", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  ⚙️ Reel Settings
                </h3>
                <div className="space-y-3">
                  <label className={cn("flex items-center justify-between p-3 rounded-xl border cursor-pointer", isDarkMode ? "border-slate-700" : "border-slate-200")}>
                    <span className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-slate-900")}>Auto-play Videos</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                  </label>
                  
                  <label className={cn("flex items-center justify-between p-3 rounded-xl border cursor-pointer", isDarkMode ? "border-slate-700" : "border-slate-200")}>
                    <span className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-slate-900")}>Show Comments</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                  </label>
                  
                  <label className={cn("flex items-center justify-between p-3 rounded-xl border cursor-pointer", isDarkMode ? "border-slate-700" : "border-slate-200")}>
                    <span className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-slate-900")}>HD Quality</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                  </label>
                </div>
              </div>

              {/* Analytics */}
              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                <h3 className={cn("text-sm font-medium mb-4", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  📊 Your Analytics
                </h3>
                <div className="space-y-3">
                  <div className={cn("p-3 rounded-xl", isDarkMode ? "bg-slate-800" : "bg-slate-50")}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>Total Views</span>
                      <span className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}>1.2K</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                  </div>
                  
                  <div className={cn("p-3 rounded-xl", isDarkMode ? "bg-slate-800" : "bg-slate-50")}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>Engagement</span>
                      <span className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}>89%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '89%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 min-h-screen">
        {/* Main Reels Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8" style={{ minHeight: '100vh' }}>
          {/* Header with Search and Filters */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className={cn("text-3xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                  {sortBy === 'trending' ? '🔥 Trending' : sortBy === 'popular' ? '⭐ Popular' : '📱 Latest'} Reels
                </h2>
                
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    className={cn(
                      "w-64 pl-10 pr-4 py-2 rounded-full border transition-all",
                      isDarkMode 
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:border-emerald-500" 
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-500 focus:border-emerald-500"
                    )}
                    placeholder="Search reels..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      viewMode === 'grid' 
                        ? "bg-emerald-500 text-white" 
                        : "text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      viewMode === 'list' 
                        ? "bg-emerald-500 text-white" 
                        : "text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Sort Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full border transition-all",
                      isDarkMode 
                        ? "bg-slate-800 border-slate-700 text-white" 
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Sort</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showFilters && (
                    <div className={cn(
                      "absolute top-full right-0 mt-2 w-48 rounded-xl shadow-lg border p-2 z-50",
                      isDarkMode 
                        ? "bg-slate-900 border-slate-700" 
                        : "bg-white border-slate-200"
                    )}>
                      <button
                        onClick={() => { setSortBy('latest'); setShowFilters(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg transition-all",
                          sortBy === 'latest' 
                            ? "bg-emerald-500 text-white" 
                            : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        📱 Latest
                      </button>
                      <button
                        onClick={() => { setSortBy('trending'); setShowFilters(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg transition-all",
                          sortBy === 'trending' 
                            ? "bg-emerald-500 text-white" 
                            : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        🔥 Trending
                      </button>
                      <button
                        onClick={() => { setSortBy('popular'); setShowFilters(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg transition-all",
                          sortBy === 'popular' 
                            ? "bg-emerald-500 text-white" 
                            : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        ⭐ Popular
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Loading Skeletons */}
              {isLoadingReels && (
                <>
                  <ReelSkeleton />
                  <ReelSkeleton />
                  <ReelSkeleton />
                  <ReelSkeleton />
                </>
              )}
              {trendingReels.map((reel, idx) => (
                <motion.div
                  key={reel._id}
                  data-reel-id={reel._id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, type: "spring", stiffness: 300 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openReelViewer(reel, reels.length + idx)}
                  className="relative aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer border-2 border-orange-500/30 hover:border-orange-500/50 transition-all shadow-lg hover:shadow-2xl"
                >
                  {/* Reel Media */}
                  {reel.mediaType === 'video' ? (
                    <div className="relative w-full h-full">
                      <video
                        ref={(el) => videoRefs.current[reel._id] = el}
                        src={reel.mediaUrl}
                        className="w-full h-full object-cover"
                        loop
                        playsInline
                        muted={true}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVideoPlay(reel._id);
                        }}
                        onMouseEnter={(e) => {
                          // Autoplay muted on hover (browser policy safe)
                          e.currentTarget.play().catch(() => {});
                        }}
                        onError={() => console.warn('[Reels] Video failed to load:', reel.mediaUrl)}
                      />
                      
                      {/* Video Controls Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {!isPlaying && (
                          <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <Play className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Video Control Buttons */}
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        {/* Play/Pause Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVideoPlay(reel._id);
                          }}
                          className="w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
                        >
                          {isPlaying === reel._id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        
                        {/* Mute/Unmute Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVideoMute(reel._id);
                          }}
                          className="w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
                        >
                          {isMuted === reel._id ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                        
                        {/* Audio Control for Added Music */}
                        {reel.audioUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAudioPlay(reel.audioUrl);
                            }}
                            className={cn(
                              "w-8 h-8 backdrop-blur-md rounded-full flex items-center justify-center transition-colors z-10",
                              currentAudio === reel.audioUrl && isAudioPlaying
                                ? "bg-purple-500 text-white hover:bg-purple-600"
                                : "bg-purple-500/80 text-white hover:bg-purple-500"
                            )}
                          >
                            {currentAudio === reel.audioUrl && isAudioPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <img
                      src={reel.mediaUrl}
                      alt={reel.caption}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Creator Info - Clickable to view profile */}
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <button
                      onClick={() => openUserProfile(reel)}
                      className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2 hover:bg-black/80 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
                        <img
                          src={`https://picsum.photos/seed/${reel.createdByName}/100/100`}
                          alt={reel.createdByName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-white text-xs font-bold hover:underline">{reel.createdByName}</span>
                    </button>
                    {/* Follow Button on Reel */}
                    {reel.createdBy !== user?._id && reel.createdByName !== user?.name && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowUser(reel.createdBy);
                          // Send notification
                          if (socket && user && !followingUsers.includes(reel.createdBy)) {
                            socket.emit('follow_notification', {
                              from: user,
                              to: reel.createdBy,
                              action: 'follow',
                              timestamp: new Date().toISOString()
                            });
                            alert(`You are now following ${reel.createdByName}! 🎉`);
                          }
                        }}
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-bold backdrop-blur-sm transition-colors",
                          followingUsers.includes(reel.createdBy)
                            ? "bg-slate-500/70 text-white"
                            : "bg-emerald-500/80 text-white hover:bg-emerald-500"
                        )}
                      >
                        {followingUsers.includes(reel.createdBy) ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>

                  {/* Stats Overlay */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-2 text-center">
                      <p className="text-white text-[12px] font-bold truncate mb-1">{reel.caption}</p>
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-red-500 fill-current" />
                          <span className="text-white text-[10px] font-bold">{(reel.likes || []).length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-blue-400" />
                          <span className="text-white text-[10px] font-bold">{(reel.comments || []).length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Like Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Trending like button clicked:', reel._id); // Debug log
                      toggleLike(reel._id, true);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
                  >
                    <Heart className={cn("w-4 h-4", reel.liked ? "fill-current text-red-500" : "")} />
                  </button>

                  {/* Like Count */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded px-3 py-2">
                      <span className="text-white text-[12px] font-bold">{(reel.likes || []).length}</span>
                      <span className="text-white text-[12px]">❤️</span>
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-2 text-center">
                      <p className="text-white text-[12px] font-bold truncate mb-1">{reel.caption}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Reels Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
                  <Play className="w-4 h-4" />
                </div>
                <h2 className={cn("text-3xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                  {showMyReels ? 'My Reels' : 'Reels'}
                </h2>
              </div>
              
              {/* My Reels Toggle Button */}
              <button
                onClick={() => {
                  setShowMyReels(!showMyReels);
                  setCurrentReelIndex(0);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
                  showMyReels 
                    ? "bg-emerald-500 text-white" 
                    : isDarkMode 
                      ? "bg-slate-800 text-white hover:bg-slate-700" 
                      : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                )}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span>{showMyReels ? 'Show All Reels' : 'My Reels'}</span>
              </button>
            </div>

            {displayReels.length > 0 ? (
              <div className="relative">
                {/* Main Reel Display */}
                <div className="flex items-center justify-center">
                  <div 
                    className="relative w-full max-w-md"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {displayReels[currentReelIndex] && (
                      <motion.div
                        key={displayReels[currentReelIndex]._id}
                        data-reel-id={displayReels[currentReelIndex]._id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => openReelViewer(displayReels[currentReelIndex], currentReelIndex)}
                        className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl cursor-pointer"
                      >
                        {/* Reel Media */}
                        {displayReels[currentReelIndex].mediaType === 'video' ? (
                          <div className="relative w-full h-full">
                            <video
                              ref={(el) => {
                                if (el) {
                                  videoRefs.current[displayReels[currentReelIndex]._id] = el;
                                  // Auto-play when video loads (muted first)
                                  el.onloadeddata = () => {
                                    el.muted = true;
                                    el.play().catch(() => {});
                                    setIsPlaying(displayReels[currentReelIndex]._id);
                                  };
                                }
                              }}
                              src={displayReels[currentReelIndex].mediaUrl}
                              className="w-full h-full object-cover"
                              loop
                              playsInline
                              muted={true}
                              controls={false}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleVideoPlay(displayReels[currentReelIndex]._id);
                              }}
                              onError={() => console.warn('[Reels] Video failed to load:', displayReels[currentReelIndex].mediaUrl)}
                            />
                            
                            {/* Video Controls Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              {!isPlaying && (
                                <div className="w-20 h-20 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                                  <Play className="w-10 h-10 text-white" />
                                </div>
                              )}
                            </div>
                            
                            {/* Video Control Buttons */}
                            <div className="absolute bottom-20 left-2 right-2 flex justify-center gap-4">
                              {/* Play/Pause Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleVideoPlay(displayReels[currentReelIndex]._id);
                                }}
                                className="w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
                              >
                                {isPlaying === displayReels[currentReelIndex]._id ? (
                                  <Pause className="w-6 h-6" />
                                ) : (
                                  <Play className="w-6 h-6" />
                                )}
                              </button>
                              
                              {/* Mute/Unmute Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleVideoMute(displayReels[currentReelIndex]._id);
                                }}
                                className="w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
                              >
                                {isMuted === displayReels[currentReelIndex]._id ? (
                                  <VolumeX className="w-6 h-6" />
                                ) : (
                                  <Volume2 className="w-6 h-6" />
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={displayReels[currentReelIndex].mediaUrl}
                            alt={displayReels[currentReelIndex].caption}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {/* Creator Info - Clickable to view profile */}
                        <div className="absolute top-2 left-2">
                          <button
                            onClick={() => openUserProfile(displayReels[currentReelIndex])}
                            className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2 hover:bg-black/80 transition-colors"
                          >
                            <div className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
                              <img
                                src={`https://picsum.photos/seed/${displayReels[currentReelIndex].createdByName}/100/100`}
                                alt={displayReels[currentReelIndex].createdByName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-white text-xs font-bold hover:underline">{displayReels[currentReelIndex].createdByName}</span>
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="absolute top-2 right-2 flex flex-col gap-2">
                          {/* Friend Request Button */}
                          {displayReels[currentReelIndex].createdByName !== user?.name && !friendRequests.includes(displayReels[currentReelIndex].createdByName || '') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Friend request button clicked:', displayReels[currentReelIndex].createdByName); // Debug log
                                sendFriendRequest(displayReels[currentReelIndex].createdByName || '');
                              }}
                              className="w-8 h-8 bg-blue-500/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-blue-500/30 transition-colors z-10"
                              title="Send Friend Request"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Comment Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Comment button clicked:', displayReels[currentReelIndex]._id); // Debug log
                              setShowComments(showComments === displayReels[currentReelIndex]._id ? null : displayReels[currentReelIndex]._id);
                            }}
                            className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          
                          {/* Like Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Slider like button clicked:', displayReels[currentReelIndex]._id); // Debug log
                              toggleLike(displayReels[currentReelIndex]._id, false);
                            }}
                            className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
                          >
                            <Heart className={cn("w-4 h-4", displayReels[currentReelIndex].liked ? "fill-current text-red-500" : "")} />
                          </button>
                          
                          {/* Share Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              shareReel(displayReels[currentReelIndex]);
                            }}
                            className="w-8 h-8 bg-green-500/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-green-500/30 transition-colors z-10"
                            title="Share to Chat"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          
                          {/* Delete Button */}
                          {displayReels[currentReelIndex].createdBy === user?._id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteReel(displayReels[currentReelIndex]._id);
                              }}
                              className="w-8 h-8 bg-red-500/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500/30 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Caption and Stats */}
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-2">
                            <p className="text-white text-[12px] font-bold truncate mb-1">{displayReels[currentReelIndex].caption}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-white text-[12px] font-bold">{(displayReels[currentReelIndex].likes || []).length}</span>
                                <span className="text-white text-[12px]">❤️</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-white text-[12px] font-bold">{(displayReels[currentReelIndex].comments || []).length}</span>
                                <span className="text-white text-[12px]">💬</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Comments Section */}
                        {showComments === displayReels[currentReelIndex]._id && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute bottom-20 left-2 right-2 bg-black/80 backdrop-blur-sm rounded-2xl p-3 max-h-40 overflow-y-auto"
                          >
                            <div className="space-y-2 mb-2">
                              {(displayReels[currentReelIndex].comments || []).map(comment => (
                                <div key={comment._id} className="text-white">
                                  <p className="text-[10px] font-bold">{comment.userName}</p>
                                  <p className="text-[11px]">{comment.text}</p>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 px-2 py-1 rounded-lg bg-white/20 text-white text-[11px] placeholder-white/50 outline-none"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.stopPropagation();
                                    addComment(displayReels[currentReelIndex]._id, false);
                                  }
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addComment(displayReels[currentReelIndex]._id, false);
                                }}
                                className="px-2 py-1 rounded-lg bg-emerald-500 text-white text-[11px] hover:bg-emerald-600"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={prevReel}
                    disabled={currentReelIndex === 0}
                    className={cn(
                      "p-3 rounded-full transition-all",
                      currentReelIndex === 0 
                        ? "opacity-50 cursor-not-allowed" 
                        : "bg-white/20 backdrop-blur-md hover:bg-white/30"
                    )}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  {/* Reel Indicators */}
                  <div className="flex gap-2">
                    {displayReels.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentReelIndex(idx)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all",
                          idx === currentReelIndex
                            ? "bg-emerald-500 w-8"
                            : "bg-white/30 hover:bg-white/50"
                        )}
                      />
                    ))}
                  </div>

                  <button
                    onClick={nextReel}
                    disabled={currentReelIndex === displayReels.length - 1}
                    className={cn(
                      "p-3 rounded-full transition-all",
                      currentReelIndex === displayReels.length - 1 
                        ? "opacity-50 cursor-not-allowed" 
                        : "bg-white/20 backdrop-blur-md hover:bg-white/30"
                    )}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : (
              /* No Reels State */
              <div className="text-center py-12">
                <div className={cn("w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center", isDarkMode ? "bg-slate-800" : "bg-slate-100")}>
                  <Play className={cn("w-8 h-8", isDarkMode ? "text-slate-600" : "text-slate-400")} />
                </div>
                <h3 className={cn("text-xl font-semibold mb-2", isDarkMode ? "text-white" : "text-slate-900")}>
                  {showMyReels ? 'No My Reels Yet' : 'No Reels Yet'}
                </h3>
                <p className={cn("text-sm mb-6", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  {showMyReels ? 'Switch to "All Reels" to see other reels, or create your own!' : 'Create your first reel to get started!'}
                </p>
                <button
                  onClick={() => showMyReels ? setShowMyReels(false) : setShowSidebar(true)}
                  className={cn(
                    "px-6 py-3 rounded-2xl font-medium transition-all",
                    isDarkMode 
                      ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  )}
                >
                  {showMyReels ? 'Show All Reels' : 'Create Your First Reel'}
                </button>
              </div>
            )}
          </div>
        </div>

      {/* Create Reel Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                  Create New Reel
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className={cn("w-5 h-5", isDarkMode ? "text-slate-400" : "text-slate-600")} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                    Caption
                  </label>
                  <input
                    type="text"
                    value={newReelCaption}
                    onChange={(e) => setNewReelCaption(e.target.value)}
                    placeholder="Write a caption..."
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border outline-none transition-all",
                      isDarkMode 
                        ? "bg-slate-900/50 border-slate-700 text-white focus:border-emerald-500/50" 
                        : "bg-white border-slate-200 text-slate-900 focus:border-emerald-500/50"
                    )}
                  />
                </div>

                <div>
                  <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                    Upload Media
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Check file size (max 50MB)
                          if (file.size > 50 * 1024 * 1024) {
                            alert('File size must be less than 50MB');
                            return;
                          }
                          setNewReelMediaType(file.type.startsWith('image/') ? 'image' : 'video');
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const result = reader.result as string;
                            setNewReelMediaUrl(result);
                            console.log('File loaded successfully:', file.type, file.size);
                          };
                          reader.onerror = () => {
                            alert('Error loading file. Please try again.');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="reel-upload"
                    />
                    <label
                      htmlFor="reel-upload"
                      className={cn(
                        "px-4 py-3 rounded-2xl font-black text-sm uppercase tracking-widest border transition-all cursor-pointer",
                        isDarkMode 
                          ? "bg-emerald-500 text-white border-emerald-500/30 hover:bg-emerald-600" 
                          : "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                      )}
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Choose File
                    </label>
                    
                    {newReelMediaUrl && (
                      <div className="flex-1">
                        {newReelMediaType === 'video' ? (
                          <video
                            src={newReelMediaUrl}
                            className="w-full h-32 object-cover rounded-2xl"
                            controls
                          />
                        ) : (
                          <img
                            src={newReelMediaUrl}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-2xl"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Audio Upload Section */}
                <div>
                  <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                    Add Music (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          addAudioToReel(file);
                        }
                      }}
                      className="hidden"
                      id="reel-audio-upload"
                    />
                    <label
                      htmlFor="reel-audio-upload"
                      className={cn(
                        "px-4 py-3 rounded-2xl font-black text-sm uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-2",
                        isDarkMode 
                          ? "bg-purple-500 text-white border-purple-500/30 hover:bg-purple-600" 
                          : "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
                      )}
                    >
                      <Music className="w-4 h-4" />
                      Add Music
                    </label>
                    
                    {newReelAudioUrl && (
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
                        <Music className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className={cn("text-sm font-medium truncate", isDarkMode ? "text-purple-300" : "text-purple-700")}>
                          Audio Added
                        </span>
                        <button
                          onClick={() => setNewReelAudioUrl('')}
                          className="ml-auto text-purple-600 dark:text-purple-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (newReelCaption.trim() && newReelMediaUrl) {
                      const input = document.getElementById('reel-upload') as HTMLInputElement;
                      const file = input.files?.[0];
                      if (file) addReel(file);
                    }
                  }}
                  disabled={!newReelCaption.trim() || !newReelMediaUrl}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-sm transition-all",
                    !newReelCaption.trim() || !newReelMediaUrl
                      ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed" 
                      : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                  )}
                >
                  Create Reel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Sidebar */}
      <AnimatePresence>
        {showProfile && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfile(false)} className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60]" />
            <motion.aside 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 35, stiffness: 350 }}
              className={cn(
                "fixed right-0 top-0 bottom-0 w-full sm:w-[450px] shadow-2xl z-[70] flex flex-col transition-colors duration-300",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
            >
              <div className={cn("p-10 border-b flex items-center justify-between", isDarkMode ? "border-slate-800" : "border-slate-100")}>
                <h2 className={cn("text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>PROFILE</h2>
                <button onClick={() => setShowProfile(false)} className={cn("p-3 rounded-2xl transition-colors", isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50")}>
                  <X className="w-7 h-7 text-slate-300" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10">
                <div className="flex flex-col items-center mb-12">
                  <div className="relative group">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className={cn(
                        "w-40 h-40 rounded-[3rem] flex items-center justify-center text-5xl font-black border-4 shadow-2xl overflow-hidden transition-colors",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-slate-600" : "bg-slate-50 border-white text-slate-300"
                      )}
                    >
                      {profilePic ? (
                        <img src={profilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        user?.name?.charAt(0).toUpperCase()
                      )}
                    </motion.div>
                    <div className="absolute -bottom-2 -right-2 flex gap-2">
                      <button 
                        onClick={() => profileInputRef.current?.click()}
                        className="p-4 bg-emerald-500 text-white rounded-[1.5rem] shadow-2xl hover:bg-emerald-600 transition-all"
                      >
                        <Camera className="w-6 h-6" />
                      </button>
                      {profilePic && (
                        <button 
                          onClick={removeProfilePic}
                          className="p-4 bg-red-500 text-white rounded-[1.5rem] shadow-2xl hover:bg-red-600 transition-all"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                    <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={handleProfilePicUpload} />
                  </div>
                  <h3 className={cn("mt-8 text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>{user?.name}</h3>
                  <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest mt-2">Verified User</p>
                </div>
                
                <div className="space-y-8">
                  {/* Stats Row */}
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <p className={cn("text-2xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>{reels.filter(r => r.createdBy === user?._id).length}</p>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Reels</p>
                    </div>
                    <div className="text-center">
                      <p className={cn("text-2xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>{followers.length}</p>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Followers</p>
                    </div>
                    <div className="text-center">
                      <p className={cn("text-2xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>{followingUsers.length}</p>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>Following</p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className={cn("flex rounded-2xl p-1", isDarkMode ? "bg-slate-800" : "bg-slate-100")}>
                    <button
                      onClick={() => setProfileTab('my-reels')}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all",
                        profileTab === 'my-reels'
                          ? (isDarkMode ? "bg-slate-700 text-white shadow-lg" : "bg-white text-slate-900 shadow-md")
                          : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                      )}
                    >
                      My Reels
                    </button>
                    <button
                      onClick={() => { setProfileTab('all-reels'); setShowProfile(false); }}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all",
                        profileTab === 'all-reels'
                          ? (isDarkMode ? "bg-slate-700 text-white shadow-lg" : "bg-white text-slate-900 shadow-md")
                          : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                      )}
                    >
                      All Reels
                    </button>
                  </div>

                  {/* My Reels Grid */}
                  {profileTab === 'my-reels' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Your Uploads</h4>
                        <span className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>{reels.filter(r => r.createdBy === user?._id).length} reels</span>
                      </div>
                      
                      {reels.filter(r => r.createdBy === user?._id).length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {reels.filter(r => r.createdBy === user?._id).map((reel) => (
                            <motion.div
                              key={reel._id}
                              whileHover={{ scale: 1.02 }}
                              className={cn(
                                "relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer",
                                isDarkMode ? "bg-slate-800" : "bg-slate-100"
                              )}
                              onClick={() => { openReelViewer(reel, 0); setShowProfile(false); }}
                            >
                              {reel.mediaType === 'video' ? (
                                <video src={reel.mediaUrl} className="w-full h-full object-cover" />
                              ) : (
                                <img src={reel.mediaUrl} alt={reel.caption} className="w-full h-full object-cover" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute bottom-2 left-2 right-2">
                                <p className="text-white text-xs font-bold truncate">{reel.caption}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-white/80 text-[10px]">{(reel.likes || []).length} ❤️</span>
                                  <span className="text-white/80 text-[10px]">{(reel.comments || []).length} 💬</span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteReel(reel._id); }}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center text-white hover:bg-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className={cn("text-center py-8 rounded-2xl", isDarkMode ? "bg-slate-800" : "bg-slate-50")}>
                          <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>No reels yet</p>
                          <button
                            onClick={() => { setShowProfile(false); setShowSidebar(true); }}
                            className="mt-3 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600"
                          >
                            Create Reel
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Followers List */}
                  {followers.length > 0 && (
                    <div className="space-y-4">
                      <h4 className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Followers</h4>
                      <div className={cn("p-4 rounded-2xl max-h-40 overflow-y-auto", isDarkMode ? "bg-slate-800" : "bg-slate-50")}>
                        <div className="flex flex-wrap gap-2">
                          {followers.map((followerId, idx) => (
                            <div key={idx} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl", isDarkMode ? "bg-slate-700" : "bg-white")}>
                              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                                {followerId.charAt(0).toUpperCase()}
                              </div>
                              <span className={cn("text-xs font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>User {followerId.slice(-4)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Enhanced Full-Screen Reel Viewer - TikTok Style */}
      <AnimatePresence>
        {isReelViewerOpen && viewingReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-black"
            onClick={closeReelViewer}
          >
            {/* Background Blur Effect */}
            <div className="absolute inset-0 overflow-hidden">
              {viewingReel.mediaType === 'video' ? (
                <video
                  src={viewingReel.mediaUrl}
                  className="w-full h-full object-cover blur-3xl opacity-50 scale-150"
                  muted
                  loop
                  autoPlay
                />
              ) : (
                <img
                  src={viewingReel.mediaUrl}
                  alt=""
                  className="w-full h-full object-cover blur-3xl opacity-50 scale-150"
                />
              )}
              <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Main Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative z-10 h-full flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Navigation Bar */}
              <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
                <button
                  onClick={closeReelViewer}
                  className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReelViewerMuted(!reelViewerMuted)}
                    className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  >
                    {reelViewerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => toggleSaveReel(viewingReel._id)}
                    className={cn(
                      "w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center transition-all",
                      savedReels.includes(viewingReel._id)
                        ? "bg-yellow-500 text-white"
                        : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    <Bookmark className={cn("w-5 h-5", savedReels.includes(viewingReel._id) && "fill-current")} />
                  </button>
                </div>
              </div>

              {/* Main Video/Image Container */}
              <div className="flex-1 flex items-center justify-center relative">
                {/* Navigation Arrows */}
                {viewingReelIndex > 0 && (
                  <button
                    onClick={() => navigateReelViewer('prev')}
                    className="absolute left-4 z-40 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {viewingReelIndex < reels.length + trendingReels.length - 1 && (
                  <button
                    onClick={() => navigateReelViewer('next')}
                    className="absolute right-4 z-40 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}

                {/* Video/Image */}
                <motion.div
                  key={viewingReel._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="relative h-[85vh] w-full max-w-md mx-auto"
                  onDoubleClick={(e) => handleDoubleTapLike(e, viewingReel)}
                >
                  {viewingReel.mediaType === 'video' ? (
                    <video
                      ref={reelViewerVideoRef}
                      src={viewingReel.mediaUrl}
                      className="w-full h-full object-cover rounded-2xl"
                      autoPlay
                      playsInline
                      loop={false}
                      muted={reelViewerMuted}
                      onTimeUpdate={updateVideoProgress}
                      onEnded={handleVideoEnded}
                    />
                  ) : (
                    <img
                      src={viewingReel.mediaUrl}
                      alt={viewingReel.caption}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  )}

                  {/* Double Tap Like Animation */}
                  <AnimatePresence>
                    {showLikeAnimation && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{
                          position: 'absolute',
                          left: likeAnimationPosition.x - 50,
                          top: likeAnimationPosition.y - 50,
                        }}
                        className="pointer-events-none z-50"
                      >
                        <Heart className="w-24 h-24 text-red-500 fill-current drop-shadow-lg" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Video Progress Bar */}
                  {viewingReel.mediaType === 'video' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500"
                        style={{ width: `${videoProgress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  )}

                  {/* Side Action Bar */}
                  <div className="absolute right-2 bottom-24 flex flex-col gap-4">
                    {/* Like Button with Animation */}
                    <motion.button
                      whileTap={{ scale: 1.3 }}
                      onClick={() => toggleLike(viewingReel._id, false)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        viewingReel.liked
                          ? "bg-red-500 text-white"
                          : "bg-white/20 backdrop-blur-md text-white hover:bg-white/30"
                      )}>
                        <Heart className={cn("w-6 h-6", viewingReel.liked && "fill-current")} />
                      </div>
                      <span className="text-white text-xs font-bold drop-shadow-lg">
                        {(viewingReel.likes || []).length}
                      </span>
                    </motion.button>

                    {/* Comment Button */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowComments(viewingReel._id)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <span className="text-white text-xs font-bold drop-shadow-lg">
                        {(viewingReel.comments || []).length}
                      </span>
                    </motion.button>

                    {/* AI Summary Button */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setSelectedReelForAI(viewingReel);
                        generateSummary(viewingReel);
                      }}
                      disabled={isGeneratingAI}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        isGeneratingAI
                          ? "bg-purple-500/50"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                      )}>
                        {isGeneratingAI ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <Sparkles className="w-6 h-6" />
                        )}
                      </div>
                      <span className="text-white text-xs font-bold drop-shadow-lg">AI</span>
                    </motion.button>

                    {/* Share Button */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => shareReel(viewingReel)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all">
                        <Share2 className="w-6 h-6" />
                      </div>
                      <span className="text-white text-xs font-bold drop-shadow-lg">Share</span>
                    </motion.button>

                    {/* Save Button */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleSaveReel(viewingReel._id)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={cn(
                        "w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center transition-all",
                        savedReels.includes(viewingReel._id)
                          ? "bg-yellow-500 text-white"
                          : "bg-white/20 text-white hover:bg-white/30"
                      )}>
                        <Bookmark className={cn("w-6 h-6", savedReels.includes(viewingReel._id) && "fill-current")} />
                      </div>
                      <span className="text-white text-xs font-bold drop-shadow-lg">
                        {savedReels.includes(viewingReel._id) ? 'Saved' : 'Save'}
                      </span>
                    </motion.button>
                  </div>

                  {/* Bottom Info Overlay */}
                  <div className="absolute bottom-4 left-4 right-20">
                    {/* Creator Info with Follow Button - Clickable to view profile */}
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        onClick={() => {
                          closeReelViewer();
                          openUserProfile(viewingReel);
                        }}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-white/20">
                          <img
                            src={`https://picsum.photos/seed/${viewingReel.createdByName}/100/100`}
                            alt={viewingReel.createdByName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-white font-bold text-sm drop-shadow-lg hover:underline">{viewingReel.createdByName}</p>
                          <p className="text-white/80 text-xs">Original Audio</p>
                        </div>
                      </button>
                      {viewingReel.createdByName !== user?.name && (
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              handleFollowUser(viewingReel.createdBy);
                              // Send notification
                              if (socket && user && !followingUsers.includes(viewingReel.createdBy)) {
                                socket.emit('follow_notification', {
                                  from: user,
                                  to: viewingReel.createdBy,
                                  action: 'follow',
                                  timestamp: new Date().toISOString()
                                });
                                alert(`You are now following ${viewingReel.createdByName}! 🎉`);
                              }
                            }}
                            className={cn(
                              "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                              followingUsers.includes(viewingReel.createdBy)
                                ? "bg-white/20 text-white border border-white/40"
                                : "bg-white text-black"
                            )}
                          >
                            {followingUsers.includes(viewingReel.createdBy) ? 'Following' : followers.includes(viewingReel.createdBy) ? 'Follow Back' : 'Follow'}
                          </motion.button>
                        </div>
                      )}
                    </div>

                    {/* Caption with Hashtags */}
                    <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 mb-2">
                      <p className="text-white text-sm font-medium leading-relaxed">
                        {viewingReel.caption}
                      </p>
                      {viewingReel.caption && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {['#reels', '#trending', '#viral'].map((tag, i) => (
                            <span key={i} className="text-emerald-400 text-xs font-medium">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Music Info */}
                    {viewingReel.audioUrl && (
                      <div className="flex items-center gap-2 text-white/90">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        >
                          <Music className="w-4 h-4" />
                        </motion.div>
                        <p className="text-xs font-medium truncate">Original Sound - {viewingReel.createdByName}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Bottom Navigation Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <button
                  onClick={() => navigateReelViewer('prev')}
                  disabled={viewingReelIndex === 0}
                  className="p-2 text-white/60 hover:text-white transition-colors disabled:opacity-30"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <span className="text-white/80 text-xs font-medium">
                  {viewingReelIndex + 1} / {reels.length + trendingReels.length}
                </span>
                <button
                  onClick={() => navigateReelViewer('next')}
                  disabled={viewingReelIndex === reels.length + trendingReels.length - 1}
                  className="p-2 text-white/60 hover:text-white transition-colors disabled:opacity-30"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Swipe Indicators */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-xs font-medium writing-vertical">
                ← Swipe
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 text-xs font-medium writing-vertical">
                Swipe →
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Modal for Reel Viewer */}
      <AnimatePresence>
        {showComments && viewingReel && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[110] bg-slate-900/95 backdrop-blur-xl rounded-t-3xl max-h-[70vh]"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-white font-bold">Comments ({(viewingReel.comments || []).length})</h3>
              <button
                onClick={() => setShowComments(null)}
                className="p-2 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh] space-y-3">
              {viewingReel.comments?.map((comment, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                    {comment.userName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-white/60 text-xs">{comment.userName}</p>
                    <p className="text-white text-sm">{comment.text}</p>
                  </div>
                </motion.div>
              ))}
              {(!viewingReel.comments || viewingReel.comments.length === 0) && (
                <p className="text-white/40 text-center py-8">No comments yet. Be the first!</p>
              )}
            </div>
            <div className="p-4 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-slate-800 text-white px-4 py-2 rounded-full text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                onKeyPress={(e) => e.key === 'Enter' && addComment(showComments, false)}
              />
              <button
                onClick={() => addComment(showComments, false)}
                disabled={!commentText.trim()}
                className="p-2 bg-emerald-500 text-white rounded-full disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Summary Modal */}
      <AnimatePresence>
        {showSummaryModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSummaryModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "fixed inset-0 m-auto w-[90%] max-w-md h-fit max-h-[80vh] rounded-3xl p-6 z-[210] overflow-y-auto",
                isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <h3 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                    AI Generated Summary
                  </h3>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className={cn(
                "p-4 rounded-2xl",
                isDarkMode ? "bg-slate-800" : "bg-slate-50"
              )}>
                <p className={cn("text-sm leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  {aiSummary}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Thumbnail Modal */}
      <AnimatePresence>
        {showThumbnailModal && generatedThumbnail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowThumbnailModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "fixed inset-0 m-auto w-[90%] max-w-md h-fit rounded-3xl p-6 z-[210]",
                isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-emerald-500" />
                  <h3 className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                    Generated Thumbnail
                  </h3>
                </div>
                <button
                  onClick={() => setShowThumbnailModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={generatedThumbnail}
                alt="Generated Thumbnail"
                className="w-full rounded-2xl mb-4"
              />
              <button
                onClick={() => {
                  // Use this thumbnail
                  setShowThumbnailModal(false);
                }}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
              >
                Use This Thumbnail
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Share Reel Modal */}
      <AnimatePresence>
        {showShareModal && reelToShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setShowShareModal(false);
              setSelectedShareTargets([]);
              setShareSearchQuery('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "w-full max-w-md rounded-2xl shadow-2xl overflow-hidden",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className={cn(
                "flex items-center justify-between p-4 border-b",
                isDarkMode ? "border-slate-800" : "border-gray-200"
              )}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={cn(
                      "font-semibold",
                      isDarkMode ? "text-white" : "text-slate-900"
                    )}>
                      Share Reel
                    </h3>
                    <p className={cn(
                      "text-xs",
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    )}>
                      {selectedShareTargets.length === 0 ? 'Select friends or groups' : (() => {
                        const friendCount = selectedShareTargets.filter(id => chatContacts.some(f => f._id === id)).length;
                        const groupCount = selectedShareTargets.filter(id => groupsList.some(g => g._id === id)).length;
                        const parts = [];
                        if (friendCount > 0) parts.push(`${friendCount} friend${friendCount > 1 ? 's' : ''}`);
                        if (groupCount > 0) parts.push(`${groupCount} group${groupCount > 1 ? 's' : ''}`);
                        return parts.join(' & ');
                      })()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowShareModal(false);
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

              {/* Reel Preview */}
              <div className={cn(
                "p-4 border-b",
                isDarkMode ? "border-slate-800 bg-slate-800/50" : "border-gray-200 bg-gray-50"
              )}>
                <div className="flex items-center gap-3">
                  {reelToShare.mediaType === 'video' ? (
                    <video
                      src={reelToShare.mediaUrl}
                      className="w-16 h-16 rounded-lg object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={reelToShare.mediaUrl}
                      alt="Reel"
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isDarkMode ? "text-white" : "text-slate-900"
                    )}>
                      {reelToShare.caption || 'Shared Reel'}
                    </p>
                    <p className={cn(
                      "text-xs",
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    )}>
                      by {reelToShare.createdByName || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="p-4">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border",
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 focus-within:border-emerald-500"
                    : "bg-gray-50 border-gray-200 focus-within:border-emerald-500"
                )}>
                  <Search className={cn(
                    "w-4 h-4",
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  )} />
                  <input
                    type="text"
                    placeholder="Search friends or groups..."
                    value={shareSearchQuery}
                    onChange={(e) => setShareSearchQuery(e.target.value)}
                    className={cn(
                      "flex-1 bg-transparent text-sm outline-none",
                      isDarkMode ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"
                    )}
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="px-4 pb-2">
                <div className={cn(
                  "flex gap-1 p-1 rounded-xl",
                  isDarkMode ? "bg-slate-800" : "bg-gray-100"
                )}>
                  <button
                    onClick={() => setShareActiveTab('friends')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                      shareActiveTab === 'friends'
                        ? "bg-emerald-500 text-white"
                        : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Users className="w-4 h-4" />
                    Friends
                    {selectedShareTargets.filter(id => chatContacts.some(f => f._id === id)).length > 0 && (
                      <span className={cn(
                        "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                        shareActiveTab === 'friends' ? "bg-white/20" : "bg-emerald-500 text-white"
                      )}>
                        {selectedShareTargets.filter(id => chatContacts.some(f => f._id === id)).length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShareActiveTab('groups')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                      shareActiveTab === 'groups'
                        ? "bg-emerald-500 text-white"
                        : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Grid className="w-4 h-4" />
                    Groups
                    {selectedShareTargets.filter(id => groupsList.some(g => g._id === id)).length > 0 && (
                      <span className={cn(
                        "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                        shareActiveTab === 'groups' ? "bg-white/20" : "bg-emerald-500 text-white"
                      )}>
                        {selectedShareTargets.filter(id => groupsList.some(g => g._id === id)).length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Recipients List */}
              <div className="flex-1 overflow-y-auto p-4 max-h-64">
                {shareActiveTab === 'friends' ? (
                  <div className="space-y-2">
                    {chatContacts.filter(f => f.name.toLowerCase().includes(shareSearchQuery.toLowerCase())).length > 0 ? (
                      chatContacts
                        .filter(f => f.name.toLowerCase().includes(shareSearchQuery.toLowerCase()))
                        .map((friend) => (
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
                            <div className="relative">
                              <img
                                src={friend.pic}
                                alt={friend.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              {friend.isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className={cn(
                                "font-medium",
                                isDarkMode ? "text-white" : "text-slate-900"
                              )}>
                                {friend.name}
                              </p>
                              <p className={cn(
                                "text-xs",
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              )}>
                                {friend.isOnline ? 'Online' : 'Offline'}
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
                        .map((group) => (
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
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              isDarkMode ? "bg-slate-700" : "bg-gray-200"
                            )}>
                              <Grid className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className={cn(
                                "font-medium",
                                isDarkMode ? "text-white" : "text-slate-900"
                              )}>
                                {group.name}
                              </p>
                              <p className={cn(
                                "text-xs",
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              )}>
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
                        <Grid className={cn("w-12 h-12 mx-auto mb-3", isDarkMode ? "text-slate-600" : "text-slate-300")} />
                        <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          {shareSearchQuery ? 'No groups found' : 'No groups available'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Share Button */}
              <div className={cn(
                "p-4 border-t",
                isDarkMode ? "border-slate-800" : "border-gray-200"
              )}>
                <button
                  onClick={handleShareReelToTargets}
                  disabled={selectedShareTargets.length === 0}
                  className={cn(
                    "w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                    selectedShareTargets.length > 0
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : isDarkMode ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                  {selectedShareTargets.length === 0 ? 'Select recipients...' : (() => {
                    const friendCount = selectedShareTargets.filter(id => chatContacts.some(f => f._id === id)).length;
                    const groupCount = selectedShareTargets.filter(id => groupsList.some(g => g._id === id)).length;
                    if (friendCount > 0 && groupCount > 0) {
                      return `Share to ${friendCount} friend${friendCount > 1 ? 's' : ''} & ${groupCount} group${groupCount > 1 ? 's' : ''}`;
                    } else if (friendCount > 0) {
                      return `Share to ${friendCount} friend${friendCount > 1 ? 's' : ''}`;
                    } else {
                      return `Share to ${groupCount} group${groupCount > 1 ? 's' : ''}`;
                    }
                  })()}
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
        targetUser={selectedUser}
        reels={[...reels, ...trendingReels]} // Pass all reels including trending
        isDarkMode={isDarkMode}
        onReelClick={(reel) => {
          setViewingReel(reel);
          setIsReelViewerOpen(true);
        }}
        onFollow={handleFollowUser}
        isFollowing={selectedUser ? followingUsers.includes(selectedUser._id) : false}
        isFollowedBy={selectedUser ? followers.includes(selectedUser._id) : false}
        onMessage={handleMessageUser}
        socket={socket}
      />
      </div>
    </div>
  );
};

export default ReelsPage;
