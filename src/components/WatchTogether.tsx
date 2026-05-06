import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import {
  X, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
  Users, MessageSquare, Smile, Send, MoreVertical, Settings,
  Monitor, ScreenShare, PictureInPicture, SkipBack, SkipForward,
  Clock, Wifi, WifiOff
} from 'lucide-react';
import type { Reel, User as UserType } from '../types';
import VerifiedBadge from './VerifiedBadge';

interface WatchTogetherProps {
  reel: Reel;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  participants?: UserType[];
  currentUser?: UserType | null;
  socket?: any;
}

interface ChatMessage {
  id: string;
  user: string;
  userId?: string;
  text: string;
  timestamp: Date;
  isEmoji?: boolean;
}

const REACTIONS = ['🔥', '😂', '❤️', '👏', '😮', '🎉'];

const WatchTogether: React.FC<WatchTogetherProps> = ({
  reel,
  isOpen,
  onClose,
  isDarkMode = false,
  participants = [],
  currentUser,
  socket,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showReactions, setShowReactions] = useState(false);
  const [reactionAnimations, setReactionAnimations] = useState<{id: string, emoji: string, x: number}[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle video time updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Set video volume when volume state changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume / 100;
    }
  }, [volume]);

  // Socket sync effects
  useEffect(() => {
    if (!socket) return;

    socket.on('watch_together_sync', (data: { currentTime: number; isPlaying: boolean; from: string }) => {
      if (data.from !== currentUser?._id) {
        setIsSyncing(true);
        const video = videoRef.current;
        if (video) {
          video.currentTime = data.currentTime;
          if (data.isPlaying && video.paused) {
            video.play().catch(() => {});
          } else if (!data.isPlaying && !video.paused) {
            video.pause();
          }
        }
        setTimeout(() => setIsSyncing(false), 500);
      }
    });

    socket.on('watch_together_chat', (data: ChatMessage) => {
      setChatMessages(prev => [...prev, { ...data, timestamp: new Date(data.timestamp) }]);
    });

    socket.on('watch_together_reaction', (data: { emoji: string; from: string }) => {
      triggerReactionAnimation(data.emoji);
    });

    return () => {
      socket.off('watch_together_sync');
      socket.off('watch_together_chat');
      socket.off('watch_together_reaction');
    };
  }, [socket, currentUser?._id]);

  const triggerReactionAnimation = (emoji: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const x = Math.random() * 80 + 10; // Random position between 10% and 90%
    setReactionAnimations(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setReactionAnimations(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }

    // Broadcast sync
    socket?.emit('watch_together_sync', {
      reelId: reel._id,
      currentTime: video.currentTime,
      isPlaying: !isPlaying,
      from: currentUser?._id,
    });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim() || !currentUser) return;

    const message: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      user: currentUser.name,
      userId: currentUser._id,
      text: chatMessage,
      timestamp: new Date(),
      isEmoji: REACTIONS.includes(chatMessage.trim()),
    };

    setChatMessages(prev => [...prev, message]);
    socket?.emit('watch_together_chat', {
      reelId: reel._id,
      ...message,
    });
    setChatMessage('');
  };

  const sendReaction = (emoji: string) => {
    triggerReactionAnimation(emoji);
    socket?.emit('watch_together_reaction', {
      reelId: reel._id,
      emoji,
      from: currentUser?._id,
    });
    setShowReactions(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl"
      ref={containerRef}
    >
      {/* Floating reaction animations */}
      <AnimatePresence>
        {reactionAnimations.map((anim) => (
          <motion.div
            key={anim.id}
            initial={{ opacity: 1, y: 0, x: `${anim.x}%`, scale: 1 }}
            animate={{ opacity: 0, y: -200, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="fixed bottom-32 text-4xl z-50 pointer-events-none"
          >
            {anim.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="w-full h-full max-w-7xl mx-auto flex flex-col lg:flex-row overflow-hidden">
        {/* Video Section */}
        <div className="flex-1 relative flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-lg">Watch Together</h3>
                    {isSyncing && (
                      <span className="text-xs text-emerald-400 animate-pulse">Syncing...</span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm">{participants.length + 1} watching</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Participants avatars */}
                <div className="flex -space-x-2 mr-3">
                  {participants.slice(0, 3).map((p, i) => (
                    <div
                      key={p._id}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 border-2 border-black flex items-center justify-center"
                      style={{ zIndex: 3 - i }}
                    >
                      <span className="text-white text-xs font-bold">
                        {p.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {participants.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-black flex items-center justify-center">
                      <span className="text-white text-xs font-bold">+{participants.length - 3}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Video Container */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {reel.mediaType === 'video' ? (
              <video
                ref={videoRef}
                src={reel.mediaUrl}
                className="w-full h-full max-h-[calc(100vh-200px)] object-contain"
                muted={isMuted}
                playsInline
                loop
              />
            ) : (
              <img
                src={reel.mediaUrl}
                alt={reel.caption}
                className="w-full h-full max-h-[calc(100vh-200px)] object-contain"
              />
            )}

            {/* Center play button */}
            <AnimatePresence>
              {!isPlaying && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/40"
                >
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                    <Play className="w-10 h-10 text-white fill-white ml-1" />
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="bg-gradient-to-t from-black to-black/80 p-4">
            {/* Progress bar */}
            <div className="mb-4">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-white/60 text-xs mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-3 bg-emerald-500 rounded-full text-white hover:bg-emerald-600 transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 text-white/80 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="w-20 h-1 bg-white/20 rounded-full appearance-none accent-emerald-500"
                />
              </div>

              {/* Reactions */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowReactions(!showReactions)}
                    className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {showReactions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 bg-slate-800 rounded-xl flex gap-1 shadow-2xl"
                      >
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => sendReaction(emoji)}
                            className="p-2 hover:bg-white/10 rounded-lg text-2xl transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => setShowChat(!showChat)}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    showChat ? "bg-emerald-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Settings dropdown */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-20 right-4 p-3 bg-slate-800 rounded-xl shadow-2xl z-30 min-w-[200px]"
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-white/60 text-xs uppercase font-bold mb-2 block">
                      Playback Speed
                    </label>
                    <div className="flex gap-2">
                      {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => {
                            setPlaybackSpeed(speed);
                            if (videoRef.current) {
                              videoRef.current.playbackRate = speed;
                            }
                          }}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
                            playbackSpeed === speed
                              ? "bg-emerald-500 text-white"
                              : "bg-white/10 text-white hover:bg-white/20"
                          )}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Section */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={cn(
                "w-full lg:w-80 border-l flex flex-col",
                isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200"
              )}
            >
              {/* Chat header */}
              <div className={cn(
                "p-4 border-b",
                isDarkMode ? "border-slate-800" : "border-slate-200"
              )}>
                <h4 className={cn(
                  "font-bold",
                  isDarkMode ? "text-white" : "text-slate-900"
                )}>
                  Watch Party Chat
                </h4>
                <p className={cn(
                  "text-xs",
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                )}>
                  {chatMessages.length} messages
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col",
                      msg.userId === currentUser?._id ? "items-end" : "items-start"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-bold mb-1",
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    )}>
                      {msg.user}
                    </span>
                    <div className={cn(
                      "px-3 py-2 rounded-xl max-w-[85%]",
                      msg.isEmoji
                        ? "text-2xl bg-transparent"
                        : msg.userId === currentUser?._id
                          ? "bg-emerald-500 text-white"
                          : isDarkMode
                            ? "bg-slate-800 text-white"
                            : "bg-slate-100 text-slate-900"
                    )}>
                      {msg.text}
                    </div>
                    <span className={cn(
                      "text-[10px] mt-1",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className={cn(
                "p-4 border-t",
                isDarkMode ? "border-slate-800" : "border-slate-200"
              )}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Type a message..."
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-sm outline-none",
                      isDarkMode
                        ? "bg-slate-800 text-white placeholder:text-slate-500"
                        : "bg-slate-100 text-slate-900 placeholder:text-slate-400"
                    )}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatMessage.trim()}
                    className="p-2 bg-emerald-500 rounded-xl text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick reactions */}
                <div className="flex gap-1 mt-2">
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default WatchTogether;
