import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { 
  X, 
  Camera, 
  Trash2, 
  Bell, 
  Shield, 
  Globe, 
  LogOut, 
  Edit2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Check,
  ChevronDown
} from 'lucide-react';
import AvatarManager from './AvatarManager';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
];

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isDarkMode: boolean;
  onLogout: () => void;
  onProfilePicUpdate: (pic: string) => void;
  onProfilePicRemove: () => void;
  profilePic: string | null;
  isVerified?: boolean;
  onLanguageChange?: (langCode: string) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  isOpen,
  onClose,
  user,
  isDarkMode,
  onLogout,
  onProfilePicUpdate,
  onProfilePicRemove,
  profilePic,
  isVerified = false,
  onLanguageChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [editedUser, setEditedUser] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    status: user?.status || 'Available to chat',
    location: user?.location || '',
    bio: user?.bio || ''
  });
  const profileInputRef = useRef<HTMLInputElement>(null);

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === user?.preferredLanguage) || SUPPORTED_LANGUAGES[0];

  const handleLanguageSelect = (langCode: string) => {
    onLanguageChange?.(langCode);
    setShowLanguageSelector(false);
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onProfilePicUpdate(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    // Here you would typically save to backend
    console.log('Saving profile:', editedUser);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedUser({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      status: user?.status || 'Available to chat',
      location: user?.location || '',
      bio: user?.bio || ''
    });
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
          />
          
          {/* Sidebar */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              "fixed right-0 top-0 bottom-0 w-full sm:w-[480px] shadow-2xl z-[70] flex flex-col",
              isDarkMode ? "bg-slate-900" : "bg-white"
            )}
          >
            {/* Header */}
            <div className={cn(
              "p-6 border-b flex items-center justify-between",
              isDarkMode ? "border-slate-800" : "border-slate-200"
            )}>
              <h2 className={cn(
                "text-2xl font-black tracking-tight",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>
                Profile
              </h2>
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                )}
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Profile Picture Section */}
              <div className="p-6 border-b">
                <div className="flex flex-col items-center">
                  <AvatarManager
                    user={user}
                    onAvatarUpdate={async (avatarUrl, avatarType) => {
                      // Update user object with new avatar
                      const updatedUser = {
                        ...user,
                        pic: avatarUrl,
                        avatarType: avatarType,
                        customAvatar: avatarType === 'custom' ? avatarUrl : user.customAvatar
                      };
                      
                      // Call the original profile update function
                      onProfilePicUpdate(avatarUrl);
                      
                      // Update user in localStorage
                      const storedUser = localStorage.getItem('user');
                      if (storedUser) {
                        const parsed = JSON.parse(storedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                      }
                      
                      // Update user on server
                      try {
                        const response = await fetch('/api/user/avatar', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            userId: user._id,
                            avatarUrl,
                            avatarType
                          })
                        });
                        
                        if (!response.ok) {
                          console.error('Failed to update avatar on server');
                        }
                      } catch (error) {
                        console.error('Error updating avatar:', error);
                      }
                    }}
                    isDarkMode={isDarkMode}
                  />
                  <h3 className={cn(
                    "mt-4 text-xl font-bold flex items-center gap-2",
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}>
                    {user?.name || 'User'}
                    {isVerified && (
                      <span className="ml-2 px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">✅ Verified</span>
                    )}
                  </h3>
                  <p className="text-emerald-500 text-sm font-medium mt-1">
                    {user?.status || 'Available to chat'}
                  </p>
                </div>
              </div>

              {/* Profile Information */}
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className={cn(
                      "text-sm font-bold uppercase tracking-wider",
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    )}>
                      Information
                    </h4>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                      )}
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className={cn(
                          "text-xs font-medium block mb-1",
                          isDarkMode ? "text-slate-400" : "text-slate-600"
                        )}>
                          Name
                        </label>
                        <input
                          type="text"
                          value={editedUser.name}
                          onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg border text-sm",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                      <div>
                        <label className={cn(
                          "text-xs font-medium block mb-1",
                          isDarkMode ? "text-slate-400" : "text-slate-600"
                        )}>
                          Email
                        </label>
                        <input
                          type="email"
                          value={editedUser.email}
                          onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg border text-sm",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                      <div>
                        <label className={cn(
                          "text-xs font-medium block mb-1",
                          isDarkMode ? "text-slate-400" : "text-slate-600"
                        )}>
                          Status
                        </label>
                        <input
                          type="text"
                          value={editedUser.status}
                          onChange={(e) => setEditedUser({...editedUser, status: e.target.value})}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg border text-sm",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleSaveProfile}
                          className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                            isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          )}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className={cn(
                            "text-xs font-medium",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            Name
                          </p>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {user?.name || 'Not set'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className={cn(
                            "text-xs font-medium",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            Email
                          </p>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {user?.email || 'Not set'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className={cn(
                            "text-xs font-medium",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            Joined
                          </p>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Settings */}
                <div className="space-y-4">
                  <h4 className={cn(
                    "text-sm font-bold uppercase tracking-wider",
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  )}>
                    Settings
                  </h4>
                  <div className="space-y-2">
                    {[
                      { icon: Bell, label: "Notifications", value: "On", clickable: false },
                      { icon: Shield, label: "Privacy", value: "Private", clickable: false },
                      { icon: Globe, label: "Language", value: `${currentLanguage.flag} ${currentLanguage.name}`, clickable: true, onClick: () => setShowLanguageSelector(true) },
                      { icon: Moon, label: "Dark Mode", value: isDarkMode ? "On" : "Off", clickable: false }
                    ].map((item, index) => (
                      <button
                        key={index}
                        onClick={item.onClick}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                          isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50",
                          item.clickable && "cursor-pointer"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4 text-slate-500" />
                          <span className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {item.label}
                          </span>
                        </div>
                        <span className={cn(
                          "text-xs font-medium",
                          isDarkMode ? "text-slate-500" : "text-slate-400"
                        )}>
                          {item.value}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Selector Modal */}
                {showLanguageSelector && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowLanguageSelector(false)}
                      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className={cn(
                        "fixed inset-x-4 top-20 bottom-20 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-80 sm:max-h-96 rounded-2xl shadow-2xl z-[90] overflow-hidden flex flex-col",
                        isDarkMode ? "bg-slate-800" : "bg-white"
                      )}
                    >
                      <div className={cn(
                        "p-4 border-b flex items-center justify-between",
                        isDarkMode ? "border-slate-700" : "border-slate-200"
                      )}>
                        <h3 className={cn(
                          "text-lg font-bold",
                          isDarkMode ? "text-white" : "text-slate-900"
                        )}>
                          Select Language
                        </h3>
                        <button
                          onClick={() => setShowLanguageSelector(false)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                          )}
                        >
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => handleLanguageSelect(lang.code)}
                            className={cn(
                              "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                              user?.preferredLanguage === lang.code
                                ? (isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                                : (isDarkMode ? "hover:bg-slate-700 text-white" : "hover:bg-slate-50 text-slate-900")
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{lang.flag}</span>
                              <span className="font-medium">{lang.name}</span>
                            </div>
                            {user?.preferredLanguage === lang.code && (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-4">
                  <button
                    className={cn(
                      "w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all",
                      isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"
                    )}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-white" : "text-slate-900"
                    )}>
                      Help & Support
                    </span>
                  </button>
                  
                  <button
                    onClick={onLogout}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all",
                      isDarkMode ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"
                    )}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Logout
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileSidebar;
