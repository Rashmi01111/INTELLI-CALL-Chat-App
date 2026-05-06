import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { MessageSquare, Users, X, Menu, Sun, Moon, Phone, Video, PhoneIncoming, PhoneOff, PhoneOutgoing, Clock, ChevronDown } from 'lucide-react';
import type { User } from '../types';
import AnimatedAvatar from './AnimatedAvatar';

interface NavbarProps {
  user?: User | null;
  setUser?: (u: User) => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  onlineCount?: number;
  storiesCount?: number;
  onProfileClick?: () => void;
  incomingCall?: { from: string; type: 'video' | 'audio' } | null;
  isCalling?: boolean;
  missedCalls?: { from: string; type: 'video' | 'audio'; timestamp: number }[];
  outgoingCalls?: { to: string; type: 'video' | 'audio'; timestamp: number; duration?: number }[];
  receivedCalls?: { from: string; type: 'video' | 'audio'; timestamp: number; duration?: number }[];
  onAcceptCall?: () => void;
  onRejectCall?: () => void;
  onDeleteCall?: (callType: 'missed' | 'outgoing' | 'received', index: number) => void;
  socketConnected?: boolean;
}

const Navbar = ({ user, setUser, isDarkMode, toggleDarkMode, onlineCount, storiesCount, onProfileClick, incomingCall, isCalling, missedCalls, outgoingCalls, receivedCalls, onAcceptCall, onRejectCall, onDeleteCall, socketConnected }: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showCallDetails, setShowCallDetails] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  
  // Calculate total call count
  const totalCalls = (missedCalls?.length || 0) + (outgoingCalls?.length || 0) + (receivedCalls?.length || 0);

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    } else if (user) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  const handleChatClick = () => {
    navigate('/chat');
  };

  const handleReelsClick = () => {
    navigate('/reels');
  };

  const handleStoriesClick = () => {
    navigate('/stories');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={cn(
      "backdrop-blur-xl border-b sticky top-0 z-50 transition-colors duration-300",
      isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-100"
    )}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className={cn(
              "p-2 rounded-xl transition-colors md:hidden",
              isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <MessageSquare className="text-white w-5 h-5" />
            </div>
            <span className={cn(
              "text-xl font-black tracking-tight",
              isDarkMode ? "text-white" : "text-slate-900"
            )}>
              IntelliCall
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 ml-10 text-xs font-bold text-slate-400">
            <Link 
              to="/about" 
              className={cn("hover:text-emerald-500 transition-colors", isActive('/about') ? "text-emerald-500" : "")}
            >
              About
            </Link>
            {user && (
              <>
                <button 
                  onClick={handleChatClick}
                  className={cn("flex items-center gap-2 font-black", isActive('/chat') ? "text-emerald-500" : "")}
                >
                  Chat
                </button>
                <button
                  onClick={handleStoriesClick}
                  className={cn("flex items-center gap-2 font-black relative", isActive('/stories') ? "text-emerald-500" : "")}
                >
                  Stories
                  {typeof storiesCount === "number" && storiesCount > 0 && (
                    <span className="px-2 py-0.5 text-[9px] bg-purple-500/15 text-purple-600 rounded-full font-black">
                      {storiesCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleReelsClick}
                  className={cn("flex items-center gap-2 hover:text-emerald-500 transition-colors", isActive('/reels') ? "text-emerald-500" : "")}
                >
                  Reels
                </button>
                
                {/* Calling Details */}
                {user && (
                  <div className="relative">
                    {/* Call Status Button */}
                    <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-700 pl-3">
                      {/* Incoming Call */}
                      {incomingCall && (
                        <div className="flex items-center gap-2 animate-pulse">
                          <PhoneIncoming className="w-4 h-4 text-red-500" />
                          <span className="text-[9px] font-bold text-red-500">
                            {incomingCall.from} ({incomingCall.type})
                          </span>
                          <button
                            onClick={onAcceptCall}
                            className="px-2 py-1 bg-emerald-500 text-white rounded text-[8px] font-black hover:bg-emerald-600"
                          >
                            Accept
                          </button>
                          <button
                            onClick={onRejectCall}
                            className="px-2 py-1 bg-red-500 text-white rounded text-[8px] font-black hover:bg-red-600"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      
                      {/* Active Call */}
                      {isCalling && !incomingCall && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-[9px] font-bold text-red-500">In Call</span>
                        </div>
                      )}
                      
                      {/* Call History Dropdown */}
                      {!incomingCall && (
                        <div className="relative">
                          <button
                            onClick={() => setShowCallDetails(!showCallDetails)}
                            className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Phone className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            {totalCalls > 0 && (
                              <span className="px-1.5 py-0.5 bg-orange-500 text-white rounded-full text-[7px] font-black">
                                {totalCalls}
                              </span>
                            )}
                            <ChevronDown className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                          </button>
                          
                          {/* Call Details Dropdown */}
                          {showCallDetails && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-[60vh] overflow-y-auto"
                            >
                              <div className="p-4">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white mb-3">Call History</h3>
                                
                                {/* Missed Calls */}
                                {missedCalls && missedCalls.length > 0 && (
                                  <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Missed Calls</h4>
                                      <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[7px] font-black">
                                        {missedCalls.length}
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      {missedCalls.slice(0, 10).map((call, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
                                          <div className="flex items-center gap-2">
                                            <PhoneOff className="w-3 h-3 text-red-500" />
                                            <div>
                                              <p className="text-[10px] font-bold text-red-600 dark:text-red-400">{call.from}</p>
                                              <p className="text-[8px] text-red-400 dark:text-red-500">
                                                {call.type} • {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                              </p>
                                            </div>
                                          </div>
                                          {onDeleteCall && (
                                            <button
                                              onClick={() => onDeleteCall('missed', i)}
                                              className="p-1 rounded hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors"
                                              title="Delete call"
                                            >
                                              <X className="w-3 h-3 text-red-500" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      {missedCalls.length > 10 && (
                                        <p className="text-[8px] text-red-400 text-center italic">
                                          +{missedCalls.length - 10} more missed calls
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Outgoing Calls */}
                                {outgoingCalls && outgoingCalls.length > 0 && (
                                  <div className="mb-4">
                                    <h4 className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Outgoing Calls</h4>
                                    <div className="space-y-2">
                                      {outgoingCalls.slice(0, 3).map((call, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                                          <div className="flex items-center gap-2">
                                            <PhoneOutgoing className="w-3 h-3 text-emerald-500" />
                                            <div>
                                              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{call.to}</p>
                                              <p className="text-[8px] text-emerald-400 dark:text-emerald-500">
                                                {call.type} • {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                              </p>
                                            </div>
                                          </div>
                                          {onDeleteCall && (
                                            <button
                                              onClick={() => onDeleteCall('outgoing', i)}
                                              className="p-1 rounded hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors"
                                              title="Delete call"
                                            >
                                              <X className="w-3 h-3 text-emerald-500" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      {outgoingCalls.length > 3 && (
                                        <p className="text-[8px] text-emerald-400 text-center italic">
                                          +{outgoingCalls.length - 3} more outgoing calls
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Received Calls */}
                                {receivedCalls && receivedCalls.length > 0 && (
                                  <div className="mb-4">
                                    <h4 className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-2">Received Calls</h4>
                                    <div className="space-y-2">
                                      {receivedCalls.slice(0, 3).map((call, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                                          <div className="flex items-center gap-2">
                                            <PhoneIncoming className="w-3 h-3 text-blue-500" />
                                            <div>
                                              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{call.from}</p>
                                              <p className="text-[8px] text-blue-400 dark:text-blue-500">
                                                {call.type} • {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                              </p>
                                            </div>
                                          </div>
                                          {onDeleteCall && (
                                            <button
                                              onClick={() => onDeleteCall('received', i)}
                                              className="p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-colors"
                                              title="Delete call"
                                            >
                                              <X className="w-3 h-3 text-blue-500" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      {receivedCalls.length > 3 && (
                                        <p className="text-[8px] text-blue-400 text-center italic">
                                          +{receivedCalls.length - 3} more received calls
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {totalCalls === 0 && (
                                  <p className="text-[9px] text-slate-400 text-center italic">No call history</p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleProfileClick}
              className={cn(
                "flex items-center gap-3 p-1.5 rounded-2xl transition-all border",
                isDarkMode ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-white border-slate-100 hover:bg-slate-50"
              )}
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                  <AnimatedAvatar username={user.name} size={32} user={user} />
                </div>
                {/* Online/Offline Status Indicator */}
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2",
                  isDarkMode ? "border-slate-800" : "border-white",
                  socketConnected ? "bg-emerald-500" : "bg-red-500"
                )} />
              </div>
              <div className="text-left pr-2 hidden sm:block">
                <p className={cn("text-xs font-black leading-none", isDarkMode ? "text-white" : "text-slate-900")}>{user.name}</p>
                <p className={cn(
                  "text-[10px] font-bold mt-1 uppercase tracking-widest",
                  socketConnected ? "text-emerald-500" : "text-red-500"
                )}>
                  {socketConnected ? "Online" : "Offline"}
                </p>
              </div>
            </motion.button>
          ) : (
            <Link to="/login" className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">Login</Link>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={cn(
            "md:hidden border-t overflow-hidden",
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          )}
        >
          <div className="flex flex-col p-4 gap-4 text-sm font-bold">
            <Link 
              to="/about" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn("p-3 rounded-xl", isActive('/about') ? "text-emerald-500" : isDarkMode ? "text-white" : "text-slate-900")}
            >
              About
            </Link>
            {user && (
              <>
                <button 
                  onClick={() => { handleChatClick(); setIsMobileMenuOpen(false); }}
                  className={cn("p-3 rounded-xl text-left", isActive('/chat') ? "text-emerald-500" : isDarkMode ? "text-white" : "text-slate-900")}
                >
                  Chat
                </button>
                <button
                  onClick={() => { handleStoriesClick(); setIsMobileMenuOpen(false); }}
                  className={cn("p-3 rounded-xl text-left", isActive('/stories') ? "text-emerald-500" : isDarkMode ? "text-white" : "text-slate-900")}
                >
                  Stories
                </button>
                <button
                  onClick={() => { handleReelsClick(); setIsMobileMenuOpen(false); }}
                  className={cn("p-3 rounded-xl text-left", isActive('/reels') ? "text-emerald-500" : isDarkMode ? "text-white" : "text-slate-900")}
                >
                  Reels
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
