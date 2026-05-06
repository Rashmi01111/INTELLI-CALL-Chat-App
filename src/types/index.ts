export interface User {
  isVerified: any;
  _id: string;
  name: string;
  email: string;
  pic: string;
  token?: string;
  lastSeen?: string;
  isOnline?: boolean;
  friends?: User[];
  isGoogleAuth?: boolean;
  googleId?: string;
  avatarType?: 'default' | 'google' | 'custom';
  customAvatar?: string;
  preferredLanguage?: string;
}

export interface StoryViewer {
  userId: string;
  userName: string;
  userPic: string;
  viewedAt: string;
}

export interface StoryReaction {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface StoryReply {
  id: string;
  userId: string;
  userName: string;
  userPic: string;
  text: string;
  timestamp: string;
}

export interface Story {
  id: string;
  userName: string;
  userPic: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  timestamp: string;
  duration: number;
  viewed?: boolean;
  liked?: boolean;
  likes?: string[];
  audioUrl?: string;
  comments?: Array<{
    id: string;
    user: string;
    userPic?: string;
    text: string;
    timestamp: string;
  }>;
  // AI & Enhanced Features
  caption?: string;
  hashtags?: string[];
  stickers?: Array<{
    id: string;
    type: 'emoji' | 'text' | 'gif' | 'auto';
    content: string;
    position: { x: number; y: number };
    rotation?: number;
    scale?: number;
  }>;
  summary?: string;
  translatedCaption?: { [lang: string]: string };
  aiGenerated?: boolean;
  // User & Engagement Features
  isVerified?: boolean;
  userId?: string;
  trendingScore?: number;
  views?: number;
  shares?: number;
  isTrending?: boolean;
  // Metadata
  location?: string;
  mood?: string;
  filter?: string;
  // Enhanced features
  viewers?: StoryViewer[];
  reactions?: StoryReaction[];
  replies?: StoryReply[];
  isArchived?: boolean;
  isCloseFriend?: boolean;
  isMuted?: boolean;
  isHighlight?: boolean;
  highlightTitle?: string;
  storyGroupId?: string;
  expiresAt?: string;
}

export interface Reel {
  _id: string;
  createdBy: string;
  createdByName: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  audioUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt?: string;
  liked?: boolean;
  likes?: string[];
  views?: number;
  comments?: {
    _id: string;
    user: string;
    userName: string;
    text: string;
    createdAt: string;
  }[];
  // AI-Generated Features
  hashtags?: string[];
  translatedCaptions?: { [lang: string]: string };
  summary?: string;
  aiGenerated?: boolean;
  aiFeatures?: {
    autoCaption?: boolean;
    hashtags?: boolean;
    thumbnail?: boolean;
    translation?: boolean;
    summary?: boolean;
  };
  detectedObjects?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface Message {
  id: string;
  user: string;
  senderId?: string;
  sender?: { _id: string; name: string; pic?: string; };
  to?: string;
  groupId?: string;
  text: string;
  image?: string;
  video?: string;
  timestamp: string;
  isSystem?: boolean;
  isAI?: boolean;
  isBlind?: boolean;
  status?: 'sent' | 'delivered' | 'read' | 'scheduled' | 'failed' | 'cancelled';
  deliveryStatus?: 'sent' | 'delivered' | 'read' | 'scheduled' | 'failed' | 'cancelled';
  deliveredAt?: string;
  profilePic?: string;
  sentiment?: string;
  isGhost?: boolean;
  audio?: string;
  reactions?: { [emoji: string]: string[] };
  likes?: string[];
  comments?: Array<{ id: string; user: string; text: string; timestamp: string }>;
  isEdited?: boolean;
  editedAt?: string;
  readBy?: string[];
  isDeleted?: boolean;
  deletedFor?: string[];
  read?: boolean;
  readAt?: string;
  delivered?: boolean;
  translatedText?: any;
  explainedText?: string;
  translateTargetLang?: string;
  reelId?: string;
  reelData?: {
    _id: string;
    caption: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    likes?: string[];
    comments?: any[];
    createdBy: string;
    createdAt?: string;
  };
  isForwarded?: boolean;
  forwardedFrom?: string;
  originalMessageId?: string;
  isScheduled?: boolean;
  scheduledTime?: string;
  isRecurring?: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurringDays?: number[];
  parentMessageId?: string;
  // Call translator subtitle fields
  isTranslated?: boolean;
  originalText?: string;
  language?: string;
  isRemoteTranslation?: boolean;
  _id?: string;
  pending?: boolean;
}

export interface Group {
  isVerified?: boolean;
  _id: string;
  name: string;
  description?: string;
  members: User[];
  admin: User | string;
  pic: string;
}

export interface FriendRequest {
  cancelledAt: string | number | Date;
  _id: string;
  from: User;
  to: User;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}
