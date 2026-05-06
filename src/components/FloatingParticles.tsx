import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface FloatingParticlesProps {
  isDarkMode: boolean;
}

const FloatingParticles = ({ isDarkMode }: FloatingParticlesProps) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: Math.random() * 0.5, 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%" 
          }}
          animate={{ 
            y: [null, Math.random() * -100 - 50 + "%"],
            opacity: [null, 0]
          }}
          transition={{ 
            duration: Math.random() * 10 + 10, 
            repeat: Infinity, 
            ease: "linear",
            delay: Math.random() * 10
          }}
          className={cn(
            "absolute w-1 h-1 rounded-full",
            isDarkMode ? "bg-emerald-500/30" : "bg-emerald-200"
          )}
        />
      ))}
    </div>
  );
};

export default FloatingParticles;
