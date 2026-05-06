import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, X, Check, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { User as UserType } from '../types';

interface AvatarManagerProps {
  user: UserType;
  onAvatarUpdate: (avatarUrl: string, avatarType: 'default' | 'google' | 'custom') => void;
  isDarkMode?: boolean;
}

const AvatarManager: React.FC<AvatarManagerProps> = ({ user, onAvatarUpdate, isDarkMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultAvatars = [
    "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=1",
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=2",
    "https://api.dicebear.com/7.x/bottts/svg?seed=1",
    "https://api.dicebear.com/7.x/bottts/svg?seed=2"
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    // For now, convert to base64 and store directly
    // In production, you'd upload to Cloudinary or similar service
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCustomAvatarUpload = async () => {
    if (!previewUrl) return;

    setIsUploading(true);
    try {
      // Get the file from input
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        const uploadedUrl = await uploadToCloudinary(file);
        onAvatarUpdate(uploadedUrl, 'custom');
        setIsModalOpen(false);
        setPreviewUrl('');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarSelect = (avatarUrl: string, type: 'default' | 'google') => {
    onAvatarUpdate(avatarUrl, type);
    setIsModalOpen(false);
  };

  const getCurrentAvatar = () => {
    switch (user.avatarType) {
      case 'google':
        return user.pic;
      case 'custom':
        return user.customAvatar || user.pic;
      default:
        return user.pic;
    }
  };

  return (
    <div className="relative">
      {/* Avatar Display */}
      <div 
        className="relative cursor-pointer group"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500 shadow-lg">
          <img
            src={getCurrentAvatar()}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Avatar Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto",
              isDarkMode ? "bg-slate-900" : "bg-white"
            )}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className={cn("text-xl font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                  Change Avatar
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    "p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Current Avatar */}
              <div>
                <h4 className={cn("text-sm font-semibold mb-3", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  Current Avatar
                </h4>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-300 dark:border-slate-600">
                    <img
                      src={getCurrentAvatar()}
                      alt="Current avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-slate-900")}>
                      {user.avatarType === 'google' ? 'Google Profile' : 
                       user.avatarType === 'custom' ? 'Custom Upload' : 'Default'}
                    </p>
                    <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                      Click an option below to change
                    </p>
                  </div>
                </div>
              </div>

              {/* Google Profile Option */}
              {user.isGoogleAuth && (
                <div>
                  <h4 className={cn("text-sm font-semibold mb-3", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                    Google Profile Picture
                  </h4>
                  <button
                    onClick={() => handleAvatarSelect(user.pic, 'google')}
                    className={cn(
                      "p-4 rounded-xl border-2 border-dashed transition-all hover:border-emerald-500",
                      isDarkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        <img
                          src={user.pic}
                          alt="Google profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-left">
                        <p className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-slate-900")}>
                          Use Google Profile
                        </p>
                        <p className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                          Your Google profile picture
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Custom Upload */}
              <div>
                <h4 className={cn("text-sm font-semibold mb-3", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  Upload Custom Avatar
                </h4>
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 border-dashed transition-all hover:border-emerald-500",
                      isDarkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-slate-400" />
                      <span className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-slate-900")}>
                        Choose Image
                      </span>
                      <span className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        JPG, PNG up to 5MB
                      </span>
                    </div>
                  </button>

                  {previewUrl && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-slate-900")}>
                            Preview
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCustomAvatarUpload}
                          disabled={isUploading}
                          className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-medium text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Use This Avatar
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setPreviewUrl('')}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Default Avatars */}
              <div>
                <h4 className={cn("text-sm font-semibold mb-3", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                  Default Avatars
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  {defaultAvatars.map((avatar, index) => (
                    <button
                      key={index}
                      onClick={() => handleAvatarSelect(avatar, 'default')}
                      className={cn(
                        "aspect-square rounded-full overflow-hidden border-2 transition-all hover:border-emerald-500 hover:scale-105",
                        isDarkMode ? "border-slate-700" : "border-slate-300"
                      )}
                    >
                      <img
                        src={avatar}
                        alt={`Avatar ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AvatarManager;
