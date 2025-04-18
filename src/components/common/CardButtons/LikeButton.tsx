/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type LikeButtonProps = {
  /** Initial liked state */
  initialLiked?: boolean;
  /** Size of the button (in pixels) */
  size?: number;
  /** Primary color for the filled heart */
  primaryColor?: string;
  /** Secondary color for gradient effect */
  secondaryColor?: string;
  /** Color for the heart outline when not liked */
  outlineColor?: string;
  /** Number of bubbles in the animation */
  bubbleCount?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Bubble dispersion radius (multiplier of size) */
  bubbleRadius?: number;
  /** Optional text to display */
  text?: string;
  /** Position of the optional text label */
  textPosition?: 'up' | 'down' | 'left' | 'right';
  /** Optional additional className */
  className?: string;
  /** Callback when like status changes */
  onLikeChange?: (isLiked: boolean) => void;
};

const LikeButton: React.FC<LikeButtonProps> = ({
  initialLiked = false,
  size = 32,
  primaryColor = '#FF3B30',
  secondaryColor = '#FF2D55',
  outlineColor = '#8E8E93',
  bubbleCount = 8,
  animationDuration = 600,
  bubbleRadius = 1.8,
  text,
  textPosition = 'right',
  className = '',
  onLikeChange,
}) => {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isAnimating, setIsAnimating] = useState(false);
  const [wasLiked, setWasLiked] = useState(initialLiked);
  
  // Update internal state when prop changes
  useEffect(() => {
    setIsLiked(initialLiked);
    setWasLiked(initialLiked);
  }, [initialLiked]);

  // Dynamic styles based on text position
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    flexDirection: 
      textPosition === 'up' ? 'column-reverse' :
      textPosition === 'down' ? 'column' :
      textPosition === 'left' ? 'row-reverse' : 'row',
    fontSize: Math.max(size * 0.45, 13),
    fontWeight: 500,
    cursor: 'pointer',
  };

  // Button container style
  const buttonContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Heart animation variants
  const heartVariants = {
    unliked: {
      scale: 1,
      transition: { 
        duration: animationDuration / 1000 * 0.3,
        ease: "easeIn"
      }
    },
    liked: {
      scale: [1, 1.3, 1],
      transition: { 
        duration: animationDuration / 1000 * 0.5,
        times: [0, 0.3, 1],
        ease: "easeOut"
      }
    },
    tap: {
      scale: 0.9,
      transition: { 
        duration: 0.1,
        ease: "easeIn"
      }
    }
  };

  // Bubble animation variants
  const bubbleVariants = {
    // Initial state for both entering and exiting bubbles
    initial: (i: number) => ({
      x: 0,
      y: 0,
      scale: 0.5,
      opacity: 0.7,
    }),
    
    // Animation when liking - bubbles go outward
    like: (i: number) => {
      const angle = (i / bubbleCount) * Math.PI * 2;
      const radius = size * bubbleRadius;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        scale: Math.random() * 0.4 + 0.8, // Random size for variety
        opacity: 0,
        transition: {
          duration: animationDuration / 1000 * (Math.random() * 0.4 + 0.6), // Varied timing
          ease: "easeOut"
        }
      };
    },
    
    // Animation when unliking - bubbles come inward
    unlike: (i: number) => ({
      x: 0,
      y: 0,
      scale: 0,
      opacity: 0,
      transition: {
        duration: animationDuration / 1000 * 0.4,
        ease: "easeIn"
      }
    })
  };

  // Toggle like state
  const toggleLike = () => {
    const newLikedState = !isLiked;
    setWasLiked(isLiked);
    setIsLiked(newLikedState);
    setIsAnimating(true);
    
    // Notify parent component
    if (onLikeChange) {
      onLikeChange(newLikedState);
    }
    
    // Reset animation state after animation completes
    const timeoutId = window.setTimeout(() => {
      setIsAnimating(false);
    }, animationDuration);
    
    return () => {
      window.clearTimeout(timeoutId);
    };
  };

  return (
    <div 
      style={containerStyle} 
      className={className}
      role="button"
      aria-pressed={isLiked}
      aria-label={isLiked ? "Unlike" : "Like"}
    >
      <div style={buttonContainerStyle}>
        {/* Bubble animations */}
        <AnimatePresence>
          {isAnimating && Array.from({ length: bubbleCount }).map((_, i) => (
            <motion.div
              key={`bubble-${i}`}
              custom={i}
              initial="initial"
              animate={isLiked ? "like" : "unlike"}
              exit="unlike"
              variants={bubbleVariants}
              style={{
                position: 'absolute',
                width: size * 0.15,
                height: size * 0.15,
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${secondaryColor}, ${primaryColor})`,
                boxShadow: `0px 0px 2px rgba(0, 0, 0, 0.1)`,
                zIndex: 0,
              }}
            />
          ))}
        </AnimatePresence>
        
        {/* Heart icon */}
        <motion.div
          initial={false}
          animate={isLiked ? "liked" : "unliked"}
          whileTap="tap"
          variants={heartVariants}
          onClick={toggleLike}
          style={{ zIndex: 1 }}
        >
          <svg 
            width={size * 0.7} 
            height={size * 0.7} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Heart shape */}
            <motion.path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ 
                fill: isLiked ? 
                  `url(#heartGradient${isLiked ? 'Liked' : 'Unliked'})` : 
                  'transparent',
                stroke: isLiked ? primaryColor : outlineColor,
              }}
              transition={{ duration: animationDuration / 1000 * 0.3 }}
            />
            
            {/* Define gradients for filled and unfilled states */}
            <defs>
              <linearGradient 
                id="heartGradientLiked" 
                x1="0%" 
                y1="0%" 
                x2="100%" 
                y2="100%"
              >
                <stop offset="0%" stopColor={secondaryColor} />
                <stop offset="100%" stopColor={primaryColor} />
              </linearGradient>
              <linearGradient 
                id="heartGradientUnliked" 
                x1="0%" 
                y1="0%" 
                x2="100%" 
                y2="100%"
              >
                <stop offset="0%" stopColor="transparent" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </div>

      {/* Optional text */}
      {text && (
        <span style={{ 
          color: isLiked ? primaryColor : 'inherit',
          transition: `color ${animationDuration / 2}ms ease`
        }}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LikeButton;
