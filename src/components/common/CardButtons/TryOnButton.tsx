import React, { useState } from 'react';
import { motion } from 'framer-motion';

export type TryOnButtonProps = {
  /** Text to display next to the icon */
  text?: string;
  /** Position of the optional text label */
  textPosition?: 'up' | 'down' | 'left' | 'right';
  /** Size of the button (in pixels) */
  size?: number;
  /** Primary color for the button (gradient start) */
  primaryColor?: string;
  /** Secondary color for the button (gradient end) */
  secondaryColor?: string;
  /** Button shape - mannequin or glasses */
  iconType?: 'mannequin' | 'glasses';
  /** Optional loading state */
  isLoading?: boolean;
  /** Optional additional className */
  className?: string;
  /** Callback for button click */
  onPress?: () => void;
  /** Animation duration in ms */
  animationDuration?: number;
};

const TryOnButton: React.FC<TryOnButtonProps> = ({
  text,
  textPosition = 'right',
  size = 40,
  primaryColor = '#007AFF',
  secondaryColor = '#00C6FF',
  iconType = 'mannequin',
  isLoading = false,
  className = '',
  onPress,
  animationDuration = 250,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  // Dynamic styles based on text position
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    flexDirection: 
      textPosition === 'up' ? 'column-reverse' :
      textPosition === 'down' ? 'column' :
      textPosition === 'left' ? 'row-reverse' : 'row',
    fontSize: Math.max(size * 0.4, 14),
    fontWeight: 600,
    cursor: 'pointer',
  };

  // Button container with 3D effect
  const buttonContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    boxShadow: isPressed 
      ? '0px 2px 5px rgba(0, 0, 0, 0.1)' 
      : isHovered 
        ? '0px 8px 15px rgba(0, 0, 0, 0.15)' 
        : '0px 4px 10px rgba(0, 0, 0, 0.12)',
    transition: `box-shadow ${animationDuration}ms ease-out`,
  };

  // 3D button animation variants
  const buttonVariants = {
    initial: { 
      rotateY: 0, 
      rotateX: 0,
      scale: 1,
    },
    hover: { 
      rotateY: 5, 
      rotateX: -5,
      scale: 1.05,
      transition: { 
        duration: animationDuration / 1000,
        ease: "easeOut" 
      }
    },
    tap: { 
      rotateY: 0, 
      rotateX: 0, 
      scale: 0.95,
      transition: { 
        duration: animationDuration / 1000 * 0.5,
        ease: "easeIn" 
      }
    },
  };

  // Loading animation variants
  const loadingVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1.5,
        ease: "linear",
        repeat: Infinity
      }
    }
  };

  // Shine effect animation
  const shineVariants = {
    initial: { 
      opacity: 0,
      x: -size,
      y: -size,
    },
    hover: {
      opacity: 0.6,
      x: size,
      y: size,
      transition: {
        duration: animationDuration / 1000 * 1.5,
        ease: "easeOut"
      }
    }
  };

  // Icon paths based on type
  const renderIcon = () => {
    if (isLoading) {
      return (
        <motion.circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke={primaryColor}
          strokeWidth="3"
          strokeDasharray="80"
          strokeDashoffset="60"
          animate="animate"
          variants={loadingVariants}
        />
      );
    }

    if (iconType === 'glasses') {
      return (
        <>
          <path
            d="M7 14C7 11.7909 8.79086 10 11 10H13C15.2091 10 17 11.7909 17 14V16C17 18.2091 15.2091 20 13 20H11C8.79086 20 7 18.2091 7 16V14Z"
            fill="url(#tryOnGradient)"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M23 14C23 11.7909 24.7909 10 27 10H29C31.2091 10 33 11.7909 33 14V16C33 18.2091 31.2091 20 29 20H27C24.7909 20 23 18.2091 23 16V14Z"
            fill="url(#tryOnGradient)"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M17 14H23"
            stroke="url(#tryOnGradient)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M7 14L4 14"
            stroke="url(#tryOnGradient)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M36 14L33 14"
            stroke="url(#tryOnGradient)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      );
    }

    return (
      <>
        <path
          d="M20 8C23.3137 8 26 10.6863 26 14C26 17.3137 23.3137 20 20 20C16.6863 20 14 17.3137 14 14C14 10.6863 16.6863 8 20 8Z"
          fill="url(#tryOnGradient)"
          stroke="white"
          strokeWidth="1.5"
        />
        <path
          d="M10 25C10 21.6863 14.4772 19 20 19C25.5228 19 30 21.6863 30 25V32H10V25Z"
          fill="url(#tryOnGradient)"
          stroke="white"
          strokeWidth="1.5"
        />
      </>
    );
  };

  const handleClick = () => {
    if (!isLoading && onPress) {
      onPress();
    }
  };

  return (
    <div 
      style={containerStyle} 
      className={className}
      role="button"
      aria-label="Try on in 3D"
      aria-busy={isLoading}
    >
      <motion.div
        style={buttonContainerStyle}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
      >
        {/* Shine effect overlay */}
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '50%',
            background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0) 100%)`,
            zIndex: 1,
            pointerEvents: 'none',
          }}
          variants={shineVariants}
        />

        {/* Icon SVG */}
        <svg 
          width={size * 0.8} 
          height={size * 0.8} 
          viewBox="0 0 40 40" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'relative', zIndex: 0 }}
        >
          <defs>
            <linearGradient id="tryOnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>
          </defs>
          {renderIcon()}
        </svg>
      </motion.div>

      {/* Optional text */}
      {text && (
        <span style={{ 
          opacity: isLoading ? 0.7 : 1,
          transition: 'opacity 0.2s ease'
        }}>
          {text}
        </span>
      )}
    </div>
  );
};

export default TryOnButton;
