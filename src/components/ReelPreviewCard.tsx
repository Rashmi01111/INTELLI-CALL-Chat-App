import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { 
  Play, Heart, MessageCircle, Share2, Bookmark, 
  MoreHorizontal, Send, X, Verified, TrendingUp,
  Eye, Clock, User
} from 'lucide-react';
import type { Reel, User as UserType } from '../types';
import VerifiedBadge from './VerifiedBadge';

interface ReelPreviewCardProps {
  reel: Reel;
  isDarkMode?: boolean;
  onClick?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onWatchTogether?: () => void;
  onRepostToStory?: () => void;
  compact?: boolean;
  showActions?: boolean;
  currentUser?: UserType | null;
}

const ReelPreviewCard: React.FC<ReelPreviewCardProps> = ({
  reel,
  isDarkMode = false,
  onClick,
  onLike,
  onComment,
  onShare,
  onWatchTogether,
  onRepostToStory,
  compact = false,
  showActions = true,
  currentUser
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isLiked = reel.likes?.includes(currentUser?.name || '');
  const likesCount = reel.likes?.length || 0;
  const commentsCount = reel.comments?.length || 0;
  const isTrending = likesCount > 10;
  const isVerified = reel.createdBy?.startsWith('verified_') || isTrending;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "relative overflow-hidden rounded-2xl cursor-pointer group",
          "border transition-all duration-300",
          isDarkMode 
            ? "bg-slate-900/60 border-slate-700/50 hover:border-emerald-500/50" 
            : "bg-white/80 border-slate-200/50 hover:border-emerald-400/50",
          "shadow-lg hover:shadow-xl"
        )}
      >
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative flex items-center gap-3 p-3">
          {/* Thumbnail */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
            {reel.mediaType === 'video' ? (
              <video
                src={reel.mediaUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            ) : (
              <img
                src={reel.mediaUrl}
                alt={reel.caption}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setImageLoaded(true)}
              />
            )}
            
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
            
            {/* Reel badge */}
            <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
              <span className="text-[8px] font-black text-white uppercase tracking-wider">Reel</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {isVerified && <VerifiedBadge size="sm" isDarkMode={isDarkMode} />}
              {isTrending && <VerifiedBadge type="trending" size="sm" isDarkMode={isDarkMode} />}
            </div>
            <p className={cn(
              "text-sm font-semibold truncate",
              isDarkMode ? "text-white" : "text-slate-900"
            )}>
              {reel.caption || "Shared Reel"}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn(
                "text-xs flex items-center gap-1",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}>
                <Heart className={cn("w-3 h-3", isLiked && "fill-rose-500 text-rose-500")} />
                {likesCount}
              </span>
              <span className={cn(
                "text-xs flex items-center gap-1",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}>
                <MessageCircle className="w-3 h-3" />
                {commentsCount}
              </span>
            </div>
          </div>

          {/* Hover glow effect */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-500/10 via-transparent to-purple-500/10 blur-xl"
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative overflow-hidden rounded-3xl cursor-pointer group",
        "border transition-all duration-500",
        isDarkMode 
          ? "bg-slate-900/40 border-slate-700/30 hover:border-emerald-500/30" 
          : "bg-white/60 border-slate-200/30 hover:border-emerald-400/30",
        "shadow-lg hover:shadow-2xl"
      )}
    >
      {/* Glassmorphism layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />
      <div className="absolute inset-0 backdrop-blur-sm" />
      
      {/* Animated border glow */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute inset-0 rounded-3xl pointer-events-none",
              "bg-gradient-to-r from-emerald-500/20 via-purple-500/20 to-blue-500/20",
              "blur-sm"
            )}
          />
        )}
      </AnimatePresence>

      <div className="relative">
        {/* Media */}
        <div className="relative aspect-[9/16] max-h-[400px] overflow-hidden">
          {reel.mediaType === 'video' ? (
            <video
              src={reel.mediaUrl}
              className="w-full h-full object-cover"
              muted
              playsInline
              loop
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => e.currentTarget.pause()}
            />
          ) : (
            <img
              src={reel.mediaUrl}
              alt={reel.caption}
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                imageLoaded ? "opacity-100" : "opacity-0",
                isHovered && "scale-105"
              )}
              onLoad={() => setImageLoaded(true)}
            />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
            <div className="flex items-center gap-2">
              {isVerified && (
                <VerifiedBadge isDarkMode={isDarkMode} />
              )}
              {isTrending && (
                <VerifiedBadge type="trending" isDarkMode={isDarkMode} />
              )}
            </div>
            
            {/* Menu button */}
            {showActions && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Hover menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "absolute top-14 right-4 p-2 rounded-xl shadow-2xl z-50 min-w-[160px]",
                  isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"
                )}
              >
                {onWatchTogether && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onWatchTogether();
                      setShowMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isDarkMode 
                        ? "text-slate-200 hover:bg-slate-700" 
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Eye className="w-4 h-4" />
                    Watch Together
                  </button>
                )}
                {onRepostToStory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRepostToStory();
                      setShowMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isDarkMode 
                        ? "text-slate-200 hover:bg-slate-700" 
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Share2 className="w-4 h-4" />
                    Repost to Story
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isDarkMode 
                      ? "text-slate-200 hover:bg-slate-700" 
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Bookmark className="w-4 h-4" />
                  Save Reel
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Play button on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {/* Creator info */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-semibold">
                {reel.createdByName || "Unknown User"}
              </span>
              {isVerified && <Verified className="w-4 h-4 text-blue-400 fill-blue-400" />}
            </div>

            {/* Caption */}
            {reel.caption && (
              <p className="text-white/90 text-sm font-medium line-clamp-2 mb-3">
                {reel.caption}
              </p>
            )}

            {/* Action buttons */}
            {showActions && (
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike?.();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all",
                    isLiked
                      ? "bg-rose-500/90 text-white"
                      : "bg-white/20 backdrop-blur-md text-white hover:bg-white/30"
                  )}
                >
                  <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                  {likesCount > 0 && likesCount}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onComment?.();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  {commentsCount > 0 && commentsCount}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare?.();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ReelPreviewCard;
