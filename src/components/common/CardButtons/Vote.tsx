/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export type VoteProps = {
  /** Type of vote button */
  type: 'upvote' | 'downvote';
  /** Whether the vote is active */
  active?: boolean;
  /** Callback when vote is pressed */
  onPress?: () => void;
  /** Size of the button (in pixels) */
  size?: number;
  /** Color for active state */
  activeColor?: string;
  /** Color for inactive state */
  inactiveColor?: string;
  /** Duration of animations in ms */
  animationDuration?: number;
  /** Optional text to display */
  text?: string;
  /** Position of the optional text label */
  textPosition?: 'up' | 'down' | 'left' | 'right';
  /** Optional additional className */
  className?: string;
  /** Optional count to display */
  count?: number;
};

const Vote: React.FC<VoteProps> = ({
  type,
  active = false,
  onPress,
  size = 28,
  activeColor = type === 'upvote' ? '#00C853' : '#D50000',
  inactiveColor = '#BDBDBD',
  animationDuration = 300,
  text,
  textPosition = 'right',
  className = '',
  count,
}) => {
  const [isActive, setIsActive] = useState(active);
  const [isHovered, setIsHovered] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  
  // Update internal state when prop changes
  useEffect(() => {
    setIsActive(active);
  }, [active]);
  
  // Handle ripple effect timing
  useEffect(() => {
    if (showRipple) {
      const timeoutId = window.setTimeout(() => {
        setShowRipple(false);
      }, 600);
      
      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [showRipple]);

  // Dynamic styles based on text position
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    flexDirection: 
      textPosition === 'up' ? 'column-reverse' :
      textPosition === 'down' ? 'column' :
      textPosition === 'left' ? 'row-reverse' : 'row',
    fontSize: Math.max(size * 0.45, 13),
    fontWeight: 500,
    cursor: 'pointer',
  };

  // Determine icon color based on state
  const iconColor = isActive ? activeColor : isHovered ? `${inactiveColor}CC` : inactiveColor;
  
  // Button container style
  const buttonContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Button animation variants
  const buttonVariants = {
    initial: { 
      scale: 1,
    },
    hover: { 
      scale: 1.05,
      transition: { 
        duration: animationDuration / 1000 * 0.5,
        ease: "easeOut" 
      }
    },
    tap: { 
      scale: 0.95,
      transition: { 
        duration: animationDuration / 1000 * 0.3,
        ease: "easeIn" 
      }
    },
    active: {
      scale: [1, 1.2, 1],
      transition: { 
        duration: animationDuration / 1000 * 0.8,
        times: [0, 0.5, 1],
        ease: "easeInOut" 
      }
    }
  };

  // Path animation variants
  const pathVariants = {
    initial: {
      fill: inactiveColor,
      stroke: inactiveColor,
      opacity: 1
    },
    hover: {
      fill: `${inactiveColor}CC`,
      stroke: `${inactiveColor}CC`,
      scale: 1.05,
      transition: { 
        duration: animationDuration / 1000 * 0.5,
        ease: "easeOut" 
      }
    },
    active: {
      fill: activeColor,
      stroke: activeColor,
      scale: [1, 1.2, 1],
      transition: { 
        duration: animationDuration / 1000 * 0.8,
        times: [0, 0.5, 1],
        ease: "easeInOut" 
      }
    }
  };

  // Ripple animation
  const rippleVariants = {
    initial: { 
      scale: 0, 
      opacity: 0.7,
    },
    animate: {
      scale: 1.8,
      opacity: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  // Handle vote press
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    
    // Show ripple effect
    setShowRipple(true);
  };

  // Render upvote or downvote icon
  const renderIcon = () => {
    const isUpvote = type === 'upvote';
    const arrowPath = isUpvote
      ? "M12 4L20 12H15V20H9V12H4L12 4Z"
      : "M12 20L4 12H9V4H15V12H20L12 20Z";

    return (
      <svg
        width={size * 0.7}
        height={size * 0.7}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          d={arrowPath}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial="initial"
          animate={isActive ? "active" : isHovered ? "hover" : "initial"}
          variants={pathVariants}
        />
      </svg>
    );
  };

  // Count display
  const countDisplay = count !== undefined ? (
    <span style={{ 
      color: isActive ? activeColor : 'inherit',
      transition: `color ${animationDuration}ms ease-out`,
      fontWeight: isActive ? 600 : 400
    }}>
      {count}
    </span>
  ) : null;

  return (
    <div 
      style={containerStyle} 
      className={className}
      role="button"
      aria-pressed={isActive}
      aria-label={`${type === 'upvote' ? 'Upvote' : 'Downvote'}${isActive ? ', active' : ''}`}
    >
      <motion.div
        style={buttonContainerStyle}
        initial="initial"
        animate={isActive ? "active" : "initial"}
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        onClick={handlePress}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Ripple effect */}
        {showRipple && (
          <motion.div
            initial="initial"
            animate="animate"
            variants={rippleVariants}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: size * 0.7,
              height: size * 0.7,
              borderRadius: '50%',
              backgroundColor: activeColor,
              transform: 'translate(-50%, -50%)',
              zIndex: -1,
            }}
          />
        )}
        
        {/* Vote icon */}
        {renderIcon()}
      </motion.div>

      {/* Optional text or count */}
      {text ? <span>{text}</span> : countDisplay}
    </div>
  );
};

export default Vote;
