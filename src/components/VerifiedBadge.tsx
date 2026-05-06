import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { BadgeCheck, Flame, Star, Crown, Zap, TrendingUp } from 'lucide-react';

type BadgeType = 'verified' | 'trending' | 'premium' | 'vip' | 'creator' | 'popular';

interface VerifiedBadgeProps {
  type?: BadgeType;
  size?: 'sm' | 'md' | 'lg';
  isDarkMode?: boolean;
  className?: string;
  animated?: boolean;
}

const badgeConfig = {
  verified: {
    icon: BadgeCheck,
    label: 'Verified',
    gradient: 'from-blue-400 to-blue-600',
    bgGradient: 'from-blue-500/20 to-blue-600/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-400/50',
    glowColor: 'shadow-blue-500/30',
  },
  trending: {
    icon: Flame,
    label: 'Trending',
    gradient: 'from-orange-400 to-red-500',
    bgGradient: 'from-orange-500/20 to-red-500/20',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-400/50',
    glowColor: 'shadow-orange-500/30',
  },
  premium: {
    icon: Crown,
    label: 'Premium',
    gradient: 'from-amber-300 to-amber-500',
    bgGradient: 'from-amber-500/20 to-amber-600/20',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-400/50',
    glowColor: 'shadow-amber-500/30',
  },
  vip: {
    icon: Star,
    label: 'VIP',
    gradient: 'from-purple-400 to-pink-500',
    bgGradient: 'from-purple-500/20 to-pink-500/20',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-400/50',
    glowColor: 'shadow-purple-500/30',
  },
  creator: {
    icon: Zap,
    label: 'Creator',
    gradient: 'from-emerald-400 to-teal-500',
    bgGradient: 'from-emerald-500/20 to-teal-500/20',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-400/50',
    glowColor: 'shadow-emerald-500/30',
  },
  popular: {
    icon: TrendingUp,
    label: 'Popular',
    gradient: 'from-rose-400 to-pink-500',
    bgGradient: 'from-rose-500/20 to-pink-500/20',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-400/50',
    glowColor: 'shadow-rose-500/30',
  },
};

const sizeConfig = {
  sm: {
    container: 'px-1.5 py-0.5 gap-1',
    icon: 'w-3 h-3',
    text: 'text-[8px]',
    borderRadius: 'rounded-md',
  },
  md: {
    container: 'px-2 py-1 gap-1.5',
    icon: 'w-4 h-4',
    text: 'text-[10px]',
    borderRadius: 'rounded-lg',
  },
  lg: {
    container: 'px-3 py-1.5 gap-2',
    icon: 'w-5 h-5',
    text: 'text-xs',
    borderRadius: 'rounded-xl',
  },
};

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  type = 'verified',
  size = 'md',
  isDarkMode = false,
  className,
  animated = true,
}) => {
  const config = badgeConfig[type];
  const Icon = config.icon;
  const sizes = sizeConfig[size];

  const badgeContent = (
    <div
      className={cn(
        'inline-flex items-center font-black uppercase tracking-wider border backdrop-blur-md transition-all duration-300',
        sizes.container,
        sizes.borderRadius,
        config.bgGradient,
        config.textColor,
        config.borderColor,
        'bg-gradient-to-r',
        className
      )}
    >
      <Icon className={cn(sizes.icon, type === 'verified' && 'fill-current')} />
      <span className={sizes.text}>{config.label}</span>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ 
          scale: 1.05,
          boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)',
        }}
        className={cn(
          'inline-block relative',
          'hover:' + config.glowColor
        )}
      >
        {/* Animated glow effect */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-lg bg-gradient-to-r',
            config.gradient,
            'opacity-0 blur-md -z-10'
          )}
          animate={{
            opacity: [0, 0.3, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {badgeContent}
      </motion.div>
    );
  }

  return badgeContent;
};

// Multiple badges display component
interface BadgeStackProps {
  badges: BadgeType[];
  size?: 'sm' | 'md' | 'lg';
  isDarkMode?: boolean;
  className?: string;
  maxDisplay?: number;
}

export const BadgeStack: React.FC<BadgeStackProps> = ({
  badges,
  size = 'md',
  isDarkMode = false,
  className,
  maxDisplay = 3,
}) => {
  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {displayBadges.map((badge, index) => (
        <motion.div
          key={badge}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <VerifiedBadge
            type={badge}
            size={size}
            isDarkMode={isDarkMode}
            animated={false}
          />
        </motion.div>
      ))}
      {remainingCount > 0 && (
        <span
          className={cn(
            'text-xs font-bold',
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          )}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

export default VerifiedBadge;
