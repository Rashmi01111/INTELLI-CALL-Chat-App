import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import {
  Sparkles, X, ChevronRight, TrendingUp, Clock,
  RefreshCw, Play, Share2, Wand2, MessageSquare,
  Lightbulb, Zap, Hash, Brain
} from 'lucide-react';
import type { Reel, Message, User as UserType } from '../types';
import ReelPreviewCard from './ReelPreviewCard';

interface AISuggestionsProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  messages: Message[];
  reels: Reel[];
  currentUser?: UserType | null;
  onShareReel?: (reel: Reel) => void;
  onWatchTogether?: (reel: Reel) => void;
}

interface SuggestedReel {
  reel: Reel;
  relevanceScore: number;
  reason: string;
  topics: string[];
}

const AISuggestions: React.FC<AISuggestionsProps> = ({
  isOpen,
  onClose,
  isDarkMode = false,
  messages,
  reels,
  currentUser,
  onShareReel,
  onWatchTogether,
}) => {
  const [suggestions, setSuggestions] = useState<SuggestedReel[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggested' | 'trending' | 'recent'>('suggested');
  const [extractedTopics, setExtractedTopics] = useState<string[]>([]);
  const [showTopicCloud, setShowTopicCloud] = useState(false);

  // Extract topics from chat messages
  const extractTopics = useCallback((msgs: Message[]): string[] => {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'need', 'dare', 'ought', 'used', 'to', 'it', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);
    
    const topicCounts: Map<string, number> = new Map();
    
    msgs.forEach(msg => {
      if (msg.text && !msg.isSystem && !msg.isAI) {
        const words = msg.text.toLowerCase()
          .replace(/[^\w\s#]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 2 && !stopWords.has(word));
        
        // Extract hashtags
        const hashtags = msg.text.match(/#\w+/g) || [];
        hashtags.forEach(tag => {
          const cleanTag = tag.slice(1).toLowerCase();
          topicCounts.set(cleanTag, (topicCounts.get(cleanTag) || 0) + 3);
        });
        
        words.forEach(word => {
          if (!word.startsWith('#')) {
            topicCounts.set(word, (topicCounts.get(word) || 0) + 1);
          }
        });
      }
    });

    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic]) => topic);
  }, []);

  // Generate AI suggestions based on chat topics
  const generateSuggestions = useCallback(() => {
    setIsAnalyzing(true);
    
    const topics = extractTopics(messages.slice(-50)); // Last 50 messages
    setExtractedTopics(topics);

    // Simple relevance scoring algorithm
    const scoredReels = reels.map(reel => {
      let score = 0;
      const matchedTopics: string[] = [];

      topics.forEach(topic => {
        const caption = reel.caption?.toLowerCase() || '';
        const hashtags = reel.hashtags || [];
        
        if (caption.includes(topic)) {
          score += 2;
          matchedTopics.push(topic);
        }
        
        hashtags.forEach(tag => {
          if (tag.toLowerCase().includes(topic)) {
            score += 3;
            if (!matchedTopics.includes(topic)) {
              matchedTopics.push(topic);
            }
          }
        });

        // Check detected objects if available
        if (reel.detectedObjects) {
          reel.detectedObjects.forEach(obj => {
            if (obj.toLowerCase().includes(topic)) {
              score += 2;
              if (!matchedTopics.includes(topic)) {
                matchedTopics.push(topic);
              }
            }
          });
        }
      });

      // Boost score for trending reels
      if ((reel.likes || []).length > 10) score += 1;
      if ((reel.views || 0) > 100) score += 1;

      // Generate reason
      let reason = '';
      if (matchedTopics.length > 0) {
        reason = `Matches your chat about: ${matchedTopics.slice(0, 3).join(', ')}`;
      } else if ((reel.likes || []).length > 10) {
        reason = 'Trending in your network';
      } else {
        reason = 'Recommended based on your activity';
      }

      return {
        reel,
        relevanceScore: score,
        reason,
        topics: matchedTopics,
      };
    });

    // Sort by relevance and take top suggestions
    const topSuggestions = scoredReels
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .filter(s => s.relevanceScore > 0)
      .slice(0, 6);

    // Simulate AI processing delay
    setTimeout(() => {
      setSuggestions(topSuggestions);
      setIsAnalyzing(false);
    }, 800);
  }, [messages, reels, extractTopics]);

  // Auto-generate suggestions when opened
  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      generateSuggestions();
    }
  }, [isOpen, suggestions.length, generateSuggestions]);

  const getTabReels = () => {
    switch (activeTab) {
      case 'suggested':
        return suggestions;
      case 'trending':
        return reels
          .filter(r => (r.likes || []).length > 5)
          .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
          .slice(0, 6)
          .map(r => ({ reel: r, relevanceScore: 0, reason: 'Trending now', topics: [] }));
      case 'recent':
        return reels
          .slice(0, 6)
          .map(r => ({ reel: r, relevanceScore: 0, reason: 'Recently added', topics: [] }));
      default:
        return suggestions;
    }
  };

  if (!isOpen) return null;

  const displayReels = getTabReels();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={cn(
          "w-full max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col",
          isDarkMode 
            ? "bg-slate-900/95 border border-slate-800" 
            : "bg-white/95 border border-slate-200"
        )}
      >
        {/* Header */}
        <div className={cn(
          "p-6 border-b flex items-center justify-between",
          isDarkMode ? "border-slate-800" : "border-slate-200"
        )}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-1 border-2 border-transparent border-t-purple-400 border-r-pink-400 rounded-2xl"
              />
            </div>
            <div>
              <h2 className={cn(
                "text-xl font-bold",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>
                AI Reel Suggestions
              </h2>
              <p className={cn(
                "text-sm",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}>
                Based on your conversation topics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTopicCloud(!showTopicCloud)}
              className={cn(
                "p-2 rounded-xl transition-colors",
                showTopicCloud
                  ? "bg-purple-500 text-white"
                  : isDarkMode
                    ? "bg-slate-800 text-slate-400 hover:text-white"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
              )}
            >
              <Hash className="w-5 h-5" />
            </button>
            <button
              onClick={generateSuggestions}
              disabled={isAnalyzing}
              className={cn(
                "p-2 rounded-xl transition-colors",
                isDarkMode
                  ? "bg-slate-800 text-slate-400 hover:text-white"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900"
              )}
            >
              <RefreshCw className={cn("w-5 h-5", isAnalyzing && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
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
        </div>

        {/* Topic Cloud */}
        <AnimatePresence>
          {showTopicCloud && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={cn(
                "border-b overflow-hidden",
                isDarkMode ? "border-slate-800 bg-slate-800/30" : "border-slate-200 bg-slate-50"
              )}
            >
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span className={cn(
                    "text-sm font-bold",
                    isDarkMode ? "text-slate-300" : "text-slate-700"
                  )}>
                    Topics detected from your chat
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extractedTopics.map((topic, index) => (
                    <motion.span
                      key={topic}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        index === 0 ? "bg-purple-500 text-white" :
                        index === 1 ? "bg-pink-500 text-white" :
                        index === 2 ? "bg-blue-500 text-white" :
                        isDarkMode
                          ? "bg-slate-700 text-slate-300"
                          : "bg-slate-200 text-slate-600"
                      )}
                    >
                      #{topic}
                    </motion.span>
                  ))}
                  {extractedTopics.length === 0 && (
                    <span className={cn(
                      "text-sm",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>
                      Start chatting to see topic suggestions!
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className={cn(
          "flex border-b",
          isDarkMode ? "border-slate-800" : "border-slate-200"
        )}>
          {[
            { id: 'suggested', label: 'AI Suggested', icon: Sparkles },
            { id: 'trending', label: 'Trending', icon: TrendingUp },
            { id: 'recent', label: 'Recent', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors relative",
                activeTab === tab.id
                  ? isDarkMode
                    ? "text-purple-400"
                    : "text-purple-600"
                  : isDarkMode
                    ? "text-slate-400 hover:text-slate-300"
                    : "text-slate-500 hover:text-slate-700"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5",
                    isDarkMode ? "bg-purple-400" : "bg-purple-600"
                  )}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 mb-4"
              />
              <p className={cn(
                "text-lg font-bold",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>
                Analyzing your conversation...
              </p>
              <p className={cn(
                "text-sm mt-2",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}>
                Finding the perfect reels for your topics
              </p>
            </div>
          ) : displayReels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Lightbulb className="w-10 h-10 text-slate-400" />
              </div>
              <p className={cn(
                "text-lg font-bold",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>
                No suggestions yet
              </p>
              <p className={cn(
                "text-sm mt-2 text-center max-w-md",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}>
                Keep chatting to get personalized reel recommendations based on your conversation topics!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayReels.map((suggestion, index) => (
                <motion.div
                  key={suggestion.reel._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "group relative rounded-2xl overflow-hidden border transition-all duration-300",
                    isDarkMode
                      ? "bg-slate-800/50 border-slate-700 hover:border-purple-500/50"
                      : "bg-white border-slate-200 hover:border-purple-400/50",
                    "hover:shadow-xl"
                  )}
                >
                  {/* Reel preview */}
                  <div className="relative aspect-[9/16] max-h-[200px] overflow-hidden">
                    {suggestion.reel.mediaType === 'video' ? (
                      <video
                        src={suggestion.reel.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={suggestion.reel.mediaUrl}
                        alt={suggestion.reel.caption}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    {/* AI badge */}
                    {activeTab === 'suggested' && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-purple-500/90 rounded-lg">
                        <Sparkles className="w-3 h-3 text-white" />
                        <span className="text-white text-[10px] font-bold">
                          {Math.round(suggestion.relevanceScore * 10)}% match
                        </span>
                      </div>
                    )}

                    {/* Caption overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-medium line-clamp-2">
                        {suggestion.reel.caption || "No caption"}
                      </p>
                    </div>
                  </div>

                  {/* Info section */}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3 h-3 text-purple-500" />
                      <span className={cn(
                        "text-xs",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        {suggestion.reason}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onShareReel?.(suggestion.reel)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors",
                          isDarkMode
                            ? "bg-slate-700 text-white hover:bg-slate-600"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        )}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                      </button>
                      <button
                        onClick={() => onWatchTogether?.(suggestion.reel)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors",
                          "bg-purple-500 text-white hover:bg-purple-600"
                        )}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Watch Together
                      </button>
                    </div>
                  </div>

                  {/* Hover glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          "p-4 border-t flex items-center justify-between",
          isDarkMode ? "border-slate-800" : "border-slate-200"
        )}>
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-500" />
            <span className={cn(
              "text-xs",
              isDarkMode ? "text-slate-400" : "text-slate-500"
            )}>
              AI analyzes your last 50 messages
            </span>
          </div>
          <button
            onClick={() => setActiveTab('suggested')}
            className={cn(
              "flex items-center gap-1 text-xs font-bold transition-colors",
              isDarkMode ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"
            )}
          >
            View All Reels
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AISuggestions;
