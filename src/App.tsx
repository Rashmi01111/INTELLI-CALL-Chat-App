import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import ChatPage from './pages/ChatPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import StoriesPage from './pages/StoriesPage';
import ReelsPage from './pages/ReelsPage';
import ProfilePage from './pages/ProfilePage';
import { cn } from './lib/utils';
import { User } from './types';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Restore existing login if available, and keep the current session.
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.warn('Unable to parse stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  // Initialize socket when user is logged in
  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setSocketConnected(false);
      }
      return;
    }

    // Skip if socket already exists and is connected for this user
    if (socket && socket.connected && user._id) {
      console.log("🔌 App: Socket already connected for user");
      // Just ensure setup is sent
      socket.emit('setup', { _id: user._id, name: user.name, pic: user.pic, email: user.email });
      return;
    }

    const getServerUrl = () => {
      // Preferred explicit override for remote/production deployment
      const envServerUrl = (import.meta as any).env?.VITE_SERVER_URL || (import.meta as any).env?.VITE_API_URL || (process as any).env?.VITE_SERVER_URL || (process as any).env?.VITE_API_URL;
      if (envServerUrl) {
        console.log('🌐 Using VITE_SERVER_URL/VITE_API_URL from env:', envServerUrl);
        return envServerUrl;
      }

      const hostname = window.location.hostname;
      const port = window.location.port;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

      // If the app is served from the same origin, use that origin.
      if (!isLocalhost) {
        return window.location.origin;
      }

      // If frontend is running on a local dev server different from the backend,
      // connect to the default backend port 3009.
      if (port && port !== '3009') {
        console.log(`🔌 Localhost frontend port ${port} detected, using backend port 3009 for sockets`);
        return `${window.location.protocol}//${hostname}:3009`;
      }

      return window.location.origin;
    };

    const serverUrl = getServerUrl();
    console.log("🔌 App: Connecting to socket at:", serverUrl);

    const newSocket: Socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 5000,
      autoConnect: true,
      withCredentials: false // Disable withCredentials for better proxy compatibility
    });

    newSocket.on('connect', () => {
      console.log('✅ App: Socket connected successfully');
      console.log('🔌 Socket ID:', newSocket.id);
      console.log('🔌 Socket connected:', newSocket.connected);
      console.log('🔌 Server URL:', serverUrl);
      console.log('🔌 User logged in:', user ? user.name : 'No user');
      setSocketConnected(true);
      
      // Send setup event immediately to register user as online
      if (user && user._id) {
        const setupData = { 
          _id: user._id, 
          name: user.name,
          pic: user.pic,
          email: user.email
        };
        console.log('📤 App: Emitting setup event with data:', setupData);
        newSocket.emit('setup', setupData);
        console.log('📤 App: Sent setup for user:', user.name, 'ID:', user._id);
        
        // Also get online users to see who's available
        newSocket.emit('get_online_users');
        console.log('📤 App: Requested online users list');
      } else {
        console.log('⚠️ App: No user available for socket setup');
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ App: Socket disconnected');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.log('❌ App: Socket connection error:', err.message);
      console.log('❌ Error details:', err);
      console.log('❌ Server URL was:', serverUrl);
      setSocketConnected(false);
    });

    setSocket(newSocket);

    // Cleanup only on user change/unmount
    return () => {
      console.log("🔌 App: Cleaning up socket effect");
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.disconnect();
      }
    };
    // IMPORTANT: Only depend on user._id, NOT socket to prevent infinite loop
  }, [user?._id]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Handle page visibility changes to maintain online status
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket && socket.connected && user?._id) {
        // Re-emit setup when user comes back to tab to ensure online status
        console.log('👁️ Tab became visible, re-establishing presence');
        socket.emit('setup', { _id: user._id, name: user.name, pic: user.pic, email: user.email });
        socket.emit('get_online_users');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?._id, user?.name, user?.pic, user?.email]);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className={cn("min-h-screen", isDarkMode ? "dark bg-slate-950" : "bg-white")}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage isDarkMode={isDarkMode} setUser={setUser} toggleDarkMode={toggleDarkMode} />} />
          <Route path="/register" element={<SignupPage isDarkMode={isDarkMode} setUser={setUser} toggleDarkMode={toggleDarkMode} />} />
          <Route path="/chat" element={<ChatPage user={user} setUser={setUser} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} socket={socket} socketConnected={socketConnected} />} />
          <Route path="/about" element={<AboutPage isDarkMode={isDarkMode} user={user} toggleDarkMode={toggleDarkMode} />} />
          <Route path="/stories" element={<StoriesPage isDarkMode={isDarkMode} user={user} setUser={setUser} toggleDarkMode={toggleDarkMode} socket={socket} socketConnected={socketConnected} />} />
          <Route path="/reels" element={<ReelsPage isDarkMode={isDarkMode} user={user} setUser={setUser} toggleDarkMode={toggleDarkMode} socket={socket} socketConnected={socketConnected} />} />
          <Route path="/profile" element={<ProfilePage isDarkMode={isDarkMode} user={user} toggleDarkMode={toggleDarkMode} socket={socket} socketConnected={socketConnected} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
