import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Mail, Lock, ArrowRight, MessageCircle, Zap, Shield, Users, Sparkles } from 'lucide-react';
import { User } from '../types';
import Navbar from '../components/Navbar';

interface LoginPageProps {
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  onLogin?: (user: User) => void;
}

const LoginPage = ({ setUser, isDarkMode, toggleDarkMode }: { setUser: (u: User | null) => void, isDarkMode?: boolean, toggleDarkMode?: () => void }) => {
  // toggleDarkMode is used by Navbar component
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        navigate('/chat');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className={cn("min-h-screen flex flex-col relative overflow-hidden", isDarkMode ? "bg-slate-950" : "bg-gradient-to-br from-emerald-50 via-white to-cyan-50")}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
      <Navbar isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 p-6 lg:p-12 max-w-6xl mx-auto w-full relative z-10">
        {/* Left Side - Project Info */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col justify-center max-w-lg text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-6 mx-auto lg:mx-0 w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            IntelliCall Platform
          </div>
          
          <h1 className={cn("text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6", isDarkMode ? "text-white" : "text-slate-900")}>
            Connect & Chat in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">
              Real Time
            </span>
          </h1>
          
          <p className={cn("text-base md:text-lg leading-relaxed mb-8", isDarkMode ? "text-slate-400" : "text-slate-600")}>
            A modern messaging platform with AI assistant, voice & video calls, stories, and real-time translation. Built for seamless communication.
          </p>
          
          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className={cn("flex items-center gap-3 p-3 rounded-xl", isDarkMode ? "bg-slate-800/50" : "bg-white/60 backdrop-blur-sm")}>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className={cn("font-bold text-sm", isDarkMode ? "text-white" : "text-slate-900")}>Real-time</p>
                <p className={cn("text-xs", isDarkMode ? "text-slate-500" : "text-slate-500")}>Instant messaging</p>
              </div>
            </div>
            <div className={cn("flex items-center gap-3 p-3 rounded-xl", isDarkMode ? "bg-slate-800/50" : "bg-white/60 backdrop-blur-sm")}>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className={cn("font-bold text-sm", isDarkMode ? "text-white" : "text-slate-900")}>Secure</p>
                <p className={cn("text-xs", isDarkMode ? "text-slate-500" : "text-slate-500")}>End-to-end encrypted</p>
              </div>
            </div>
            <div className={cn("flex items-center gap-3 p-3 rounded-xl", isDarkMode ? "bg-slate-800/50" : "bg-white/60 backdrop-blur-sm")}>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className={cn("font-bold text-sm", isDarkMode ? "text-white" : "text-slate-900")}>Social</p>
                <p className={cn("text-xs", isDarkMode ? "text-slate-500" : "text-slate-500")}>Stories & Reels</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
            <span className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border", isDarkMode ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-600")}>AI Assistant</span>
            <span className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border", isDarkMode ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-600")}>Translation</span>
            <span className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border", isDarkMode ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-600")}>Voice/Video</span>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col justify-center max-w-md"
        >
          <div className={cn("p-8 rounded-2xl shadow-xl backdrop-blur-xl", isDarkMode ? "bg-slate-800/50 border border-slate-700" : "bg-white/70 backdrop-blur-sm border border-slate-200")}>
            <h2 className={cn("text-2xl font-bold mb-6 text-center", isDarkMode ? "text-white" : "text-slate-900")}>
              Welcome Back
            </h2>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className={cn(
                      "w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all",
                      isDarkMode 
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500" 
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white"
                    )}
                  />
                </div>
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className={cn(
                      "w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all",
                      isDarkMode 
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500" 
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white"
                    )}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Footer */}
            <p className={cn("mt-6 text-center text-sm", isDarkMode ? "text-slate-500" : "text-slate-500")}>
              Don't have an account?{' '}
              <button 
                onClick={() => navigate('/register')}
                className="text-emerald-500 font-semibold hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
