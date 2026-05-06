




import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import {
  X, User, MapPin, Link as LinkIcon, Calendar,
  Grid, Heart, MessageCircle, Share2, Bookmark,
  Verified, TrendingUp, Users, Eye, ArrowLeft,
  Play, Pause, Volume2, VolumeX
} from 'lucide-react';
import type { User as UserType, Reel } from '../types';
import VerifiedBadge from './VerifiedBadge';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  targetUser: UserType | null;
  reels: Reel[];
  isDarkMode?: boolean;
  onReelClick?: (reel: Reel) => void;
  onFollow?: (userId: string) => void;
  isFollowing?: boolean;
  isFollowedBy?: boolean; // Whether target user follows current user
  socket?: any; // For real-time notifications
  onMessage?: (targetUser: UserType) => void; // For messaging user
  embedded?: boolean; // Render as full page without backdrop
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  targetUser,
  reels,
  isDarkMode = false,
  onReelClick,
  onFollow,
  isFollowing = false,
  isFollowedBy = false,
  socket,
  onMessage,
  embedded = false,
}) => {
  const [activeTab, setActiveTab] = useState<'reels' | 'liked' | 'saved'>('reels');
  const [playingReel, setPlayingReel] = useState<string | null>(null);
  const [mutedReel, setMutedReel] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalReels: 0,
    totalLikes: 0,
    totalViews: 0,
    followers: 0,
    following: 0,
  });

  const isOwnProfile = user?._id === targetUser?._id;
  const displayUser = targetUser || user;

  // Filter reels for this user - match by ID or name
  const userReels = reels.filter(reel =>
    reel.createdBy === displayUser?._id ||
    reel.createdByName === displayUser?.name
  );
  const likedReels = reels.filter(reel => reel.likes?.includes(displayUser?._id || ''));

  useEffect(() => {
    if (displayUser) {
      const totalLikes = userReels.reduce((sum, reel) => sum + (reel.likes?.length || 0), 0);
      const totalViews = userReels.reduce((sum, reel) => sum + (reel.views || 0), 0);

      setStats({
        totalReels: userReels.length,
        totalLikes,
        totalViews,
        followers: Math.floor(Math.random() * 5000) + 100, // Mock data
        following: Math.floor(Math.random() * 500) + 50, // Mock data
      });
    }
  }, [displayUser, reels, userReels.length]);

  const togglePlay = (e: React.MouseEvent, reelId: string) => {
    e.stopPropagation();
    const video = document.getElementById(`profile-video-${reelId}`) as HTMLVideoElement;
    if (video) {
      if (video.paused) {
        video.play();
        setPlayingReel(reelId);
      } else {
        video.pause();
        setPlayingReel(null);
      }
    }
  };

  const toggleMute = (e: React.MouseEvent, reelId: string) => {
    e.stopPropagation();
    const video = document.getElementById(`profile-video-${reelId}`) as HTMLVideoElement;
    if (video) {
      video.muted = !video.muted;
      setMutedReel(video.muted ? reelId : null);
    }
  };

  const handleFollowClick = () => {
    if (targetUser && onFollow) {
      onFollow(targetUser._id);
      // Send follow notification via socket
      if (socket && user) {
        socket.emit('follow_notification', {
          from: user,
          to: targetUser._id,
          action: isFollowing ? 'unfollow' : 'follow',
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  if (!isOpen || !displayUser) return null;

  const displayReels = activeTab === 'reels' ? userReels :
                       activeTab === 'liked' ? likedReels :
                       userReels.slice(0, 3); // Mock saved reels

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            embedded
              ? "w-full"
              : "fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          )}
          onClick={embedded ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              embedded
                ? "w-full min-h-[calc(100vh-5rem)] rounded-none overflow-hidden shadow-none flex flex-col"
                : "w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col",
              isDarkMode
                ? "bg-slate-900 border border-slate-800"
                : "bg-white border border-slate-200"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with back button */}
            <div className={cn(
              "p-4 border-b flex items-center gap-4",
              isDarkMode ? "border-slate-800" : "border-slate-200"
            )}>
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isDarkMode
                    ? "bg-slate-800 text-slate-400 hover:text-white"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
                )}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className={cn(
                "font-bold text-lg",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>
                {displayUser.name}
              </span>
              {displayUser.isVerified && (
                <VerifiedBadge type="verified" size="sm" />
              )}
            </div>

            {/* Profile Info */}
            <div className={cn(
              "p-6 border-b",
              isDarkMode ? "border-slate-800" : "border-slate-200"
            )}>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className={cn(
                    "w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4",
                    isDarkMode ? "border-slate-700" : "border-slate-200"
                  )}>
                    <img
                      src={displayUser.pic || `https://picsum.photos/seed/${displayUser._id}/200/200`}
                      alt={displayUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className={cn(
                        "text-2xl font-bold",
                        isDarkMode ? "text-white" : "text-slate-900"
                      )}>
                        {displayUser.name}
                      </h2>
                      {displayUser.isVerified && (
                        <Verified className="w-5 h-5 text-blue-500 fill-blue-500" />
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!isOwnProfile && (
                        <>
                          <button
                            onClick={handleFollowClick}
                            className={cn(
                              "px-6 py-2 rounded-xl font-bold transition-colors",
                              isFollowing
                                ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                : "bg-emerald-500 text-white hover:bg-emerald-600"
                            )}
                          >
                            {isFollowing ? 'Following' : isFollowedBy ? 'Follow Back' : 'Follow'}
                          </button>
                          {onMessage && (
                            <button
                              onClick={() => onMessage(targetUser!)}
                              className={cn(
                                "px-6 py-2 rounded-xl font-bold border transition-colors flex items-center gap-2",
                                isDarkMode
                                  ? "border-slate-700 text-white hover:bg-slate-800"
                                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
                              )}
                            >
                              <MessageCircle className="w-4 h-4" />
                              Message
                            </button>
                          )}
                        </>
                      )}
                      {isOwnProfile && (
                        <button
                          className={cn(
                            "px-6 py-2 rounded-xl font-bold border transition-colors",
                            isDarkMode
                              ? "border-slate-700 text-white hover:bg-slate-800"
                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          Edit Profile
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 mb-4">
                    <div className="text-center">
                      <span className={cn(
                        "block font-bold text-lg",
                        isDarkMode ? "text-white" : "text-slate-900"
                      )}>
                        {stats.totalReels}
                      </span>
                      <span className={cn(
                        "text-sm",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        Posts
                      </span>
                    </div>
                    <div className="text-center">
                      <span className={cn(
                        "block font-bold text-lg",
                        isDarkMode ? "text-white" : "text-slate-900"
                      )}>
                        {stats.followers.toLocaleString()}
                      </span>
                      <span className={cn(
                        "text-sm",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        Followers
                      </span>
                    </div>
                    <div className="text-center">
                      <span className={cn(
                        "block font-bold text-lg",
                        isDarkMode ? "text-white" : "text-slate-900"
                      )}>
                        {stats.following.toLocaleString()}
                      </span>
                      <span className={cn(
                        "text-sm",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        Following
                      </span>
                    </div>
                    <div className="text-center">
                      <span className={cn(
                        "block font-bold text-lg text-pink-500",
                      )}>
                        {stats.totalLikes.toLocaleString()}
                      </span>
                      <span className={cn(
                        "text-sm",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        Total Likes
                      </span>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className={cn(
                    "text-sm",
                    isDarkMode ? "text-slate-300" : "text-slate-600"
                  )}>
                    <p className="font-bold mb-1">{displayUser.name}</p>
                    <p className="mb-2">🎬 Creating amazing content • 📸 Photography • 🌍 Explorer</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Mumbai, India
                      </span>
                      <span className="flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        intelli-call.com
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      {(isFollowing || isFollowedBy) && (
                        <span className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded-full",
                          isFollowing && isFollowedBy
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-blue-100 text-blue-600"
                        )}>
                          <Users className="w-3 h-3" />
                          {isFollowing && isFollowedBy ? 'Mutual Follow' : isFollowing ? 'Following' : 'Follows You'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className={cn(
              "flex border-b",
              isDarkMode ? "border-slate-800" : "border-slate-200"
            )}>
              {[
                { id: 'reels', label: 'Reels', icon: Grid },
                { id: 'liked', label: 'Liked', icon: Heart },
                ...(isOwnProfile ? [{ id: 'saved', label: 'Saved', icon: Bookmark }] : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors relative",
                    activeTab === tab.id
                      ? isDarkMode
                        ? "text-white"
                        : "text-slate-900"
                      : isDarkMode
                        ? "text-slate-400 hover:text-slate-300"
                        : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="profileTab"
                      className={cn(
                        "absolute bottom-0 left-0 right-0 h-0.5",
                        isDarkMode ? "bg-emerald-500" : "bg-emerald-500"
                      )}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Reels Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {displayReels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center mb-4",
                    isDarkMode ? "bg-slate-800" : "bg-slate-100"
                  )}>
                    <Grid className={cn(
                      "w-10 h-10",
                      isDarkMode ? "text-slate-600" : "text-slate-400"
                    )} />
                  </div>
                  <p className={cn(
                    "text-lg font-bold",
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}>
                    No reels yet
                  </p>
                  <p className={cn(
                    "text-sm mt-2",
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  )}>
                    {activeTab === 'reels'
                      ? isOwnProfile
                        ? 'Share your first reel with the world!'
                        : 'This user hasn\'t posted any reels yet.'
                      : activeTab === 'liked'
                        ? 'No liked reels yet'
                        : 'No saved reels yet'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {displayReels.map((reel) => (
                    <motion.div
                      key={reel._id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      className={cn(
                        "relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group",
                        isDarkMode ? "bg-slate-800" : "bg-slate-100"
                      )}
                      onClick={() => onReelClick?.(reel)}
                    >
                      {reel.mediaType === 'video' ? (
                        <>
                          <video
                            id={`profile-video-${reel._id}`}
                            src={reel.mediaUrl}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                          />
                          {/* Play/Pause Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                            <button
                              onClick={(e) => togglePlay(e, reel._id)}
                              className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                            >
                              {playingReel === reel._id ? (
                                <Pause className="w-6 h-6 text-white" />
                              ) : (
                                <Play className="w-6 h-6 text-white ml-0.5" />
                              )}
                            </button>
                          </div>
                          {/* Mute button */}
                          <button
                            onClick={(e) => toggleMute(e, reel._id)}
                            className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {mutedReel === reel._id ? (
                              <VolumeX className="w-4 h-4 text-white" />
                            ) : (
                              <Volume2 className="w-4 h-4 text-white" />
                            )}
                          </button>
                        </>
                      ) : (
                        <img
                          src={reel.mediaUrl}
                          alt={reel.caption}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Stats Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-white text-sm font-medium line-clamp-2 mb-2">
                            {reel.caption}
                          </p>
                          <div className="flex items-center gap-4 text-white text-xs">
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              {(reel.likes || []).length}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              {(reel.comments || []).length}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {reel.views || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Video indicator */}
                      {reel.mediaType === 'video' && (
                        <div className="absolute top-2 left-2">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UserProfileModal;
