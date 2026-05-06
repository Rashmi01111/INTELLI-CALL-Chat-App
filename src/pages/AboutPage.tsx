import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import Navbar from '../components/Navbar';
import { MessageSquare, Users, Video, Phone, Bot, Sparkles, Code, Database, Globe, Zap, User as UserIcon, Briefcase, Palette, Shield } from 'lucide-react';
import type { User } from '../types';

interface AboutPageProps {
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  user?: User | null;
}

const AboutPage = ({ isDarkMode, toggleDarkMode, user }: AboutPageProps) => {

const TEAM_MEMBERS = [
  { name: "Rashmi", role: "Project Lead & Frontend Architect", image: "/team/rashmi.jpeg", icon: UserIcon, bio: "Leading the frontend architecture and ensuring seamless user experiences", largeImage: true },
  { name: "Shreya", role: "Backend Engineer & Database Admin", image: "/team/shreya.jpeg", icon: Database, bio: "Building robust backend systems and managing database architecture" },
  { name: "Nitin", role: "UI/UX Designer & Motion Specialist", image: "/team/nitin.jpeg", icon: Palette, bio: "Creating beautiful interfaces and smooth animations" },
  { name: "Sneha", role: "AI Integration & Security Specialist", image: "/team/sneha.jpeg?v=2", icon: Shield, bio: "Implementing AI features and ensuring top-notch security", largeImage: true },
];

  return (
    <div className={cn("min-h-screen selection:bg-emerald-100 overflow-x-hidden relative", isDarkMode ? "bg-slate-950" : "bg-gradient-to-br from-slate-50 via-white to-emerald-50/30")}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_70%)] pointer-events-none" />
      <Navbar isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} user={user} />
      
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-20 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full blur-3xl scale-150 opacity-30"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 text-emerald-600 rounded-full text-sm font-black mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              Communication Redefined
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className={cn("text-6xl md:text-7xl font-black tracking-tight mb-8 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-600 bg-clip-text text-transparent", isDarkMode ? "" : "")}>
              IntelliCall
            </h1>
            <p className={cn("text-xl md:text-2xl mb-8 max-w-4xl mx-auto leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-700")}>
              Where conversations flow naturally and technology stays invisible
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className={cn("px-6 py-3 rounded-full text-sm font-bold border backdrop-blur-sm transition-all hover:scale-105", isDarkMode ? "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/70" : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/70")}>
                🚀 Real-time Sync
              </div>
              <div className={cn("px-6 py-3 rounded-full text-sm font-bold border backdrop-blur-sm transition-all hover:scale-105", isDarkMode ? "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/70" : "border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100/70")}>
                🤖 AI Powered
              </div>
              <div className={cn("px-6 py-3 rounded-full text-sm font-bold border backdrop-blur-sm transition-all hover:scale-105", isDarkMode ? "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/70" : "border-red-200 bg-red-50/50 text-red-700 hover:bg-red-100/70")}>
                🔒 End-to-end Secure
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
        >
          {[
            { icon: MessageSquare, title: "Instant Chat", desc: "Lightning fast messaging", color: "from-blue-500 to-cyan-500" },
            { icon: Bot, title: "AI Assistant", desc: "Smart conversation help", color: "from-purple-500 to-pink-500" },
            { icon: Users, title: "Group Rooms", desc: "Team collaboration", color: "from-green-500 to-emerald-500" },
            { icon: Video, title: "Video Calls", desc: "HD face-to-face", color: "from-red-500 to-orange-500" }
          ].map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className={cn("p-8 rounded-3xl text-center border backdrop-blur-sm transition-all duration-300", isDarkMode ? "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600/50" : "bg-white/80 border-slate-100/50 hover:bg-white hover:border-emerald-200/50 hover:shadow-xl")}
            >
              <div className={`w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white shadow-lg`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className={cn("font-bold text-xl mb-3", isDarkMode ? "text-white" : "text-slate-900")}>{feature.title}</h3>
              <p className={cn("text-sm leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-600")}>{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className={cn("p-12 rounded-3xl border mb-20 backdrop-blur-sm", isDarkMode ? "bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50" : "bg-gradient-to-br from-white/80 to-emerald-50/30 border-slate-100/50")}
        >
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <h2 className={cn("text-4xl font-black mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent", isDarkMode ? "" : "")}>Early Birds Team</h2>
            </motion.div>
            <p className={cn("text-lg max-w-2xl mx-auto", isDarkMode ? "text-slate-400" : "text-slate-700")}>
              The passionate minds building the future of communication
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {TEAM_MEMBERS.map((member, idx) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + idx * 0.1 }}
                whileHover={{ y: -10, scale: 1.03 }}
                className={cn("text-center p-8 rounded-3xl border group backdrop-blur-sm transition-all duration-300", isDarkMode ? "border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 hover:border-emerald-500/30" : "border-slate-100/50 bg-white/60 hover:bg-white hover:border-emerald-200/50 hover:shadow-2xl")}
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full opacity-0 group-hover:opacity-30 transition-all duration-500 blur-xl"></div>
                  <img
                    src={member.image}
                    alt={member.name}
                    className={cn(
                      "relative mx-auto rounded-full object-cover border-4 border-white/20 shadow-xl group-hover:scale-105 transition-transform duration-300",
                      member.largeImage ? "w-36 h-36 object-center scale-110" : "w-24 h-24"
                    )}
                  />
                </div>
                <div className={`w-10 h-10 mx-auto mb-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <member.icon className="w-5 h-5" />
                </div>
                <h3 className={cn("font-bold text-xl mb-2", isDarkMode ? "text-white" : "text-slate-900")}>{member.name}</h3>
                <p className={cn("text-sm font-bold text-emerald-500 mb-4", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>{member.role}</p>
                <p className={cn("text-xs leading-relaxed px-3", isDarkMode ? "text-slate-400" : "text-slate-600")}>{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <div className={cn("inline-flex items-center gap-3 px-8 py-4 rounded-full text-sm font-bold border backdrop-blur-sm transition-all hover:scale-105", isDarkMode ? "border-slate-700/50 bg-slate-800/30 text-slate-400 hover:bg-slate-800/50" : "border-emerald-200/50 bg-emerald-50/30 text-emerald-700 hover:bg-emerald-100/50")}>
            <span className="text-red-500 text-lg">❤️</span> 
            <span>Made with passion by Early Birds Team</span>
            <span className="text-emerald-500 text-lg">🚀</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutPage;
