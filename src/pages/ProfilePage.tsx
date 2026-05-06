import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import UserProfileModal from '../components/UserProfileModal';
import type { User, Reel } from '../types';

interface ProfilePageProps {
  isDarkMode: boolean;
  user: User | null;
  toggleDarkMode: () => void;
  socket?: any;
  socketConnected?: boolean;
}

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const ProfilePage: React.FC<ProfilePageProps> = ({ isDarkMode, user, toggleDarkMode, socket, socketConnected }) => {
  const navigate = useNavigate();

  const reels = useMemo<Reel[]>(() => {
    // Prefer "myReels" (used by ReelsPage) and fall back to "userReels".
    const my = safeParse<Reel[]>(localStorage.getItem('myReels'), []);
    const userReels = safeParse<Reel[]>(localStorage.getItem('userReels'), []);

    // Merge + de-dupe by _id/id
    const map = new Map<string, Reel>();
    for (const r of [...my, ...userReels]) {
      const key = (r as any)?._id || (r as any)?.id;
      if (!key) continue;
      map.set(String(key), r);
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        user={user}
        socketConnected={socketConnected ?? socket?.connected ?? false}
        onProfileClick={() => navigate('/profile')}
      />

      {/* Full-page profile uses the same UI as the modal */}
      <UserProfileModal
        isOpen={true}
        onClose={() => navigate(-1)}
        user={user}
        targetUser={user}
        reels={reels}
        isDarkMode={isDarkMode}
        socket={socket}
        embedded
        onReelClick={() => {
          // Reels viewer lives in ReelsPage; for now just navigate there.
          navigate('/reels');
        }}
      />
    </div>
  );
};

export default ProfilePage;

