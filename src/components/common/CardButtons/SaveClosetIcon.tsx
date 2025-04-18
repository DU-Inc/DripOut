/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type SaveClosetIconProps = {
  /** Whether the item is saved to closet */
  isSaved?: boolean;
  /** Callback when save state is toggled */
  onToggle?: (isSaved: boolean) => void;
  /** Size of the button (in pixels) */
  size?: number;
  /** Primary color for the button (active state) */
  primaryColor?: string;
  /** Secondary color for the button (inactive state) */
  secondaryColor?: string;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Text to display next to the icon */
  text?: string;
  /** Position of the optional text label */
  textPosition?: 'up' | 'down' | 'left' | 'right';
  /** Icon style to use */
  iconStyle?: 'closet' | 'hanger' | 'minimal';
  /** Optional additional className */
  className?: string;
  /** Whether to show 3D effects */
  use3DEffect?: boolean;
  /** Whether to show success animation on save */
  showSuccessAnimation?: boolean;
};

const SaveClosetIcon: React.FC<SaveClosetIconProps> = ({
  isSaved = false,
  onToggle,
  size = 32,
  primaryColor = '#FF6347',
  secondaryColor = '#757575',
  animationDuration = 300,
  text,
  textPosition = 'right',
  iconStyle = 'closet',
  className = '',
  use3DEffect = true,
  showSuccessAnimation = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedState, setSavedState] = useState(isSaved);
  
  // Update internal state when prop changes
  useEffect(() => {
    setSavedState(isSaved);
  }, [isSaved]);

  // Handle success animation timing
  useEffect(() => {
    if (showSuccess && showSuccessAnimation) {
      const timeoutId = window.setTimeout(() => {
        setShowSuccess(false);
      }, 600);
      
      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [showSuccess, showSuccessAnimation]);

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

  // Button container with optional 3D effect
  const buttonContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: use3DEffect ? '#fff' : 'transparent',
    boxShadow: use3DEffect ? (isPressed 
      ? '0px 2px 3px rgba(0, 0, 0, 0.06)' 
      : isHovered 
        ? '0px 6px 12px rgba(0, 0, 0, 0.1)' 
        : '0px 3px 8px rgba(0, 0, 0, 0.08)') : 'none',
    transition: `box-shadow ${animationDuration}ms ease-out`,
  };

  // 3D button animation variants
  const buttonVariants = {
    initial: { 
      scale: 1,
    },
    hover: { 
      scale: 1.05,
      transition: { 
        duration: animationDuration / 1000,
        ease: "easeOut" 
      }
    },
    tap: { 
      scale: 0.95,
      transition: { 
        duration: animationDuration / 1000 * 0.5,
        ease: "easeIn" 
      }
    },
    success: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 0.4,
        times: [0, 0.5, 1],
        ease: "easeInOut"
      }
    }
  };

  // Success animation particles
  const particleVariants = {
    initial: { 
      opacity: 0, 
      scale: 0 
    },
    animate: (i: number) => ({
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
      x: Math.cos(i * Math.PI * 2 / 8) * size * 0.6,
      y: Math.sin(i * Math.PI * 2 / 8) * size * 0.6,
      transition: {
        duration: 0.6,
        times: [0, 0.4, 1],
        ease: "easeOut"
      }
    })
  };
  
  // Icon path variants (animated elements)
  const pathVariants = {
    unsaved: {
      opacity: 1,
      stroke: secondaryColor,
      fill: "transparent",
      transition: { duration: animationDuration / 1000 }
    },
    saved: {
      opacity: 1,
      stroke: primaryColor,
      fill: primaryColor,
      transition: { 
        duration: animationDuration / 1000,
        fill: { delay: animationDuration / 1000 * 0.2 }
      }
    }
  };

  // Handle toggling saved state
  const handleToggle = () => {
    const newState = !savedState;
    setSavedState(newState);
    
    if (newState && showSuccessAnimation) {
      setShowSuccess(true);
    }
    
    if (onToggle) {
      onToggle(newState);
    }
  };

  // Render different icon styles
  const renderIcon = () => {
    // Common attributes for the icon paths
    const state = savedState ? "saved" : "unsaved";
    const iconColor = savedState ? primaryColor : secondaryColor;
    
    switch (iconStyle) {
      case 'hanger':
        return (
          <svg 
            width={size * 0.7} 
            height={size * 0.7} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              d="M12 4C10.8954 4 10 4.89543 10 6C10 6.74028 10.4022 7.38663 11 7.73244V8C11 9.10457 11.8954 10 13 10H17C18.1046 10 19 9.10457 19 8V7.73244C19.5978 7.38663 20 6.74028 20 6C20 4.89543 19.1046 4 18 4C16.8954 4 16 4.89543 16 6C16 6.74028 16.4022 7.38663 17 7.73244V8H13V7.73244C13.5978 7.38663 14 6.74028 14 6C14 4.89543 13.1046 4 12 4Z"
              variants={pathVariants}
              animate={state}
            />
            <motion.path
              d="M4 19C4 16.7909 5.79086 15 8 15H16C18.2091 15 20 16.7909 20 19V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V19Z"
              variants={pathVariants}
              animate={state}
            />
            <motion.path
              d="M12 4V15"
              strokeWidth="2"
              strokeLinecap="round"
              variants={pathVariants}
              animate={state}
            />
          </svg>
        );
        
      case 'minimal':
        return (
          <svg 
            width={size * 0.7} 
            height={size * 0.7} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Heart in the center */}
            <motion.path
              d="M12 6L9.5 8.5L4 10L9.5 11.5L12 14L14.5 11.5L20 10L14.5 8.5L12 6Z"
              variants={pathVariants}
              animate={state}
            />
            {/* Closet outline */}
            <motion.rect
              x="4"
              y="4"
              width="16"
              height="16"
              rx="2"
              variants={pathVariants}
              animate={state}
              style={{ fill: "transparent" }}
            />
          </svg>
        );
        
      // Default 'closet' style
      default:
        return (
          <svg 
            width={size * 0.7} 
            height={size * 0.7} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Closet body */}
            <motion.rect
              x="4"
              y="4"
              width="16"
              height="16"
              rx="2"
              variants={pathVariants}
              animate={state}
            />
            {/* Shelf line */}
            <motion.line
              x1="4"
              y1="10"
              x2="20"
              y2="10"
              strokeWidth="1.5"
              variants={pathVariants}
              animate={state}
              style={{ 
                stroke: savedState ? "#fff" : secondaryColor
              }}
            />
            {/* Door divider */}
            <motion.line
              x1="12"
              y1="4"
              x2="12"
              y2="20"
              strokeWidth="1.5"
              variants={pathVariants}
              animate={state}
              style={{ 
                stroke: savedState ? "#fff" : secondaryColor
              }}
            />
            {/* Left handle */}
            <motion.circle
              cx="8"
              cy="12"
              r="1"
              variants={pathVariants}
              animate={state}
              style={{ 
                fill: savedState ? "#fff" : secondaryColor,
                stroke: "none"
              }}
            />
            {/* Right handle */}
            <motion.circle
              cx="16"
              cy="12"
              r="1"
              variants={pathVariants}
              animate={state}
              style={{ 
                fill: savedState ? "#fff" : secondaryColor,
                stroke: "none"
              }}
            />
          </svg>
        );
    }
  };

  return (
    <div 
      style={containerStyle} 
      className={className}
      role="button"
      aria-pressed={savedState}
      aria-label={savedState ? "Remove from closet" : "Save to closet"}
    >
      <motion.div
        style={buttonContainerStyle}
        initial="initial"
        animate={showSuccess ? "success" : "initial"}
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
      >
        {/* Success animation particles */}
        <AnimatePresence>
          {showSuccess && Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              custom={i}
              initial="initial"
              animate="animate"
              exit="initial"
              variants={particleVariants}
              style={{
                position: 'absolute',
                width: size * 0.15,
                height: size * 0.15,
                borderRadius: '50%',
                backgroundColor: primaryColor,
              }}
            />
          ))}
        </AnimatePresence>
        
        {/* Icon */}
        {renderIcon()}
      </motion.div>

      {/* Optional text */}
      {text && <span>{text}</span>}
    </div>
  );
};

export default SaveClosetIcon;
