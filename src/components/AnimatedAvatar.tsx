import React from 'react';

interface AnimatedAvatarProps {
  username: string;
  size?: number;
  className?: string;
  user?: any; // Optional user object for additional data
  profilePic?: string; // Direct profile picture prop
}

const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({ username, size = 40, className = '', user, profilePic }) => {
  // Check if we have a valid profile picture to display
  const displayProfilePic = profilePic || user?.customAvatar || user?.pic;
  
  // Only show profile picture if it's a valid URL
  const isValidProfilePic = displayProfilePic && 
    displayProfilePic !== 'undefined' && 
    displayProfilePic !== 'null' && 
    displayProfilePic.trim() !== '' &&
    (displayProfilePic.startsWith('http') || displayProfilePic.startsWith('data:image'));
  
  // State to track if image failed to load
  const [imgFailed, setImgFailed] = React.useState(false);
  
  // If we have a valid profile picture and it hasn't failed, show it
  if (isValidProfilePic && !imgFailed) {
    return (
      <div 
        className={`relative overflow-hidden rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={displayProfilePic}
          alt={username || 'User'}
          className="w-full h-full object-cover absolute inset-0 z-10"
          onError={() => {
            // If image fails to load, set failed state to trigger fallback avatar
            setImgFailed(true);
          }}
        />
      </div>
    );
  }

  // Detect gender based on name (simple heuristic)
  const detectGender = (name: string): 'male' | 'female' | 'other' => {
    const maleNames = ['john', 'david', 'michael', 'james', 'robert', 'william', 'richard', 'joseph', 'thomas', 'charles', 'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'steven', 'paul', 'andrew', 'joshua', 'kevin', 'brian', 'george', 'edward', 'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'frank', 'raymond', 'alexander', 'patrick', 'jack', 'dennis', 'jerry'];
    const femaleNames = ['mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'betty', 'helen', 'sandra', 'donna', 'carol', 'ruth', 'sharon', 'michelle', 'laura', 'sarah', 'kimberly', 'deborah', 'dorothy', 'amy', 'angela', 'ashley', 'brenda', 'emma', 'olivia', 'cynthia', 'marie', 'janet', 'catherine', 'frances', 'heather', 'melissa', 'debra', 'stephanie', 'rebecca', 'sharon', 'laura', 'megan', 'rachel'];
    
    const nameLower = name.toLowerCase();
    
    if (maleNames.some(male => nameLower.includes(male))) return 'male';
    if (femaleNames.some(female => nameLower.includes(female))) return 'female';
    
    // Check for common gender indicators
    if (nameLower.endsWith('a') || nameLower.endsWith('i') || nameLower.endsWith('y')) return 'female';
    if (nameLower.endsWith('o') || nameLower.endsWith('r') || nameLower.endsWith('n')) return 'male';
    
    return 'other';
  };

  // Generate gender-specific colors with improved palette
  const generateColors = (name: string, gender: 'male' | 'female' | 'other') => {
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    let hue, saturation, lightness;
    
    if (gender === 'male') {
      // Modern blue/cyan tones for male
      hue = (Math.abs(hash) % 40) + 180; // 180-220 (cyan to blue range)
      saturation = 70 + (Math.abs(hash >> 8) % 20);
      lightness = 45 + (Math.abs(hash >> 16) % 10);
    } else if (gender === 'female') {
      // Modern pink/purple tones for female
      hue = (Math.abs(hash) % 50) + 280; // 280-330 (purple to pink range)
      saturation = 75 + (Math.abs(hash >> 8) % 15);
      lightness = 50 + (Math.abs(hash >> 16) % 10);
    } else {
      // Modern emerald/teal tones for other/unknown
      hue = (Math.abs(hash) % 40) + 140; // 140-180 (emerald to cyan range)
      saturation = 65 + (Math.abs(hash >> 8) % 25);
      lightness = 48 + (Math.abs(hash >> 16) % 12);
    }
    
    return {
      primary: `hsl(${hue % 360}, ${saturation}%, ${lightness}%)`,
      secondary: `hsl(${(hue + 25) % 360}, ${saturation - 5}%, ${lightness + 8}%)`,
      accent: `hsl(${(hue + 50) % 360}, ${saturation - 10}%, ${lightness + 15}%)`,
    };
  };

  const gender = detectGender(username);
  const colors = generateColors(username, gender);
  const initials = username.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);

  // Gender-specific icon/symbol
  const getGenderSymbol = () => {
    if (gender === 'male') return '♂';
    if (gender === 'female') return '♀';
    return '⚧';
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.accent} 100%)`,
          }}
        />
        <div 
          className="absolute inset-0 animate-spin-slow"
          style={{
            background: `conic-gradient(from 0deg, ${colors.primary}, ${colors.secondary}, ${colors.accent}, ${colors.primary})`,
            opacity: 0.3,
          }}
        />
      </div>
      
      {/* Gender-specific animated elements */}
      <div className="absolute inset-0">
        {gender === 'male' ? (
          // Male: Sharp, angular particles
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-sm animate-float"
              style={{
                left: `${25 + (i * 20)}%`,
                top: `${25 + (i * 15)}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + (i * 0.3)}s`,
                transform: 'rotate(45deg)',
              }}
            />
          ))
        ) : gender === 'female' ? (
          // Female: Soft, circular particles
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-white rounded-full animate-float"
              style={{
                left: `${15 + (i * 12)}%`,
                top: `${15 + (i * 10)}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${3 + (i * 0.4)}s`,
              }}
            />
          ))
        ) : (
          // Other: Mixed shapes
          [...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 bg-white ${i % 2 === 0 ? 'rounded-full' : 'rounded-sm'} animate-float`}
              style={{
                left: `${20 + (i * 15)}%`,
                top: `${20 + (i * 12)}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${2.5 + (i * 0.5)}s`,
                transform: i % 2 === 0 ? 'rotate(0deg)' : 'rotate(45deg)',
              }}
            />
          ))
        )}
      </div>
      
      {/* Initials with gender symbol */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="font-bold text-white drop-shadow-lg leading-none"
          style={{ fontSize: `${size * 0.35}px` }}
        >
          {initials}
        </span>
        <span 
          className="text-white opacity-70"
          style={{ fontSize: `${size * 0.2}px` }}
        >
          {getGenderSymbol()}
        </span>
      </div>
      
      {/* Shimmer effect */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          animation: 'shimmer 2s infinite',
        }}
      />
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedAvatar;
