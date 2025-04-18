/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export type LinkButtonProps = {
  /** URL to navigate to when clicked */
  href?: string;
  /** Callback when link is clicked */
  onClick?: () => void;
  /** Size of the icon (in pixels) */
  size?: number;
  /** Height of the overlay (in pixels or percentage) */
  overlayHeight?: string | number;
  /** Width of the overlay (in pixels or percentage) */
  overlayWidth?: string | number;
  /** Primary color for the icon */
  color?: string;
  /** Background color for the overlay */
  backgroundColor?: string;
  /** Opacity of the overlay (0-1) */
  overlayOpacity?: number;
  /** Duration of animations in ms */
  animationDuration?: number;
  /** Optional text to display */
  text?: string;
  /** Whether to always show the overlay (default false) */
  alwaysShowOverlay?: boolean;
  /** Optional additional className */
  className?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Whether to trigger ripple effect on click */
  showRippleEffect?: boolean;
};

const LinkButton: React.FC<LinkButtonProps> = ({
  href,
  onClick,
  size = 24,
  overlayHeight = '100%',
  overlayWidth = '100%',
  color = '#007AFF',
  backgroundColor = 'rgba(0, 0, 0, 0.05)',
  overlayOpacity = 0.7,
  animationDuration = 300,
  text,
  alwaysShowOverlay = false,
  className = '',
  ariaLabel = 'Open external link',
  showRippleEffect = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [ripplePosition, setRipplePosition] = useState({ x: 0, y: 0 });
  
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

  // Container styles
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: overlayWidth,
    height: overlayHeight,
    overflow: 'hidden',
    borderRadius: 'inherit',
  };

  // Overlay animation variants
  const overlayVariants = {
    hidden: { 
      opacity: 0,
      transition: {
        duration: animationDuration / 1000,
        ease: "easeOut"
      }
    },
    visible: { 
      opacity: overlayOpacity,
      transition: {
        duration: animationDuration / 1000,
        ease: "easeOut"
      }
    }
  };

  // Icon animation variants
  const iconVariants = {
    initial: { 
      scale: 1,
      x: 0,
    },
    hover: { 
      scale: 1.1,
      x: -3,
      transition: {
        duration: animationDuration / 1000 * 0.5,
        ease: "easeOut"
      }
    },
    tap: {
      scale: 0.95,
      transition: {
        duration: animationDuration / 1000 * 0.3,
        ease: "easeInOut"
      }
    }
  };

  // Ripple animation variants
  const rippleVariants = {
    initial: {
      scale: 0,
      opacity: 0.5,
    },
    animate: {
      scale: 4,
      opacity: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  // Handle link click
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
    
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
    
    if (showRippleEffect) {
      // Calculate ripple position relative to the clicked element
      const rect = e.currentTarget.getBoundingClientRect();
      setRipplePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setShowRipple(true);
    }
  };

  return (
    <motion.div
      style={containerStyle}
      className={className}
      initial="initial"
      animate={isHovered ? "hover" : "initial"}
      whileTap="tap"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      role="link"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
    >
      {/* Overlay background */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor,
          zIndex: 0,
        }}
        initial={alwaysShowOverlay ? "visible" : "hidden"}
        animate={alwaysShowOverlay || isHovered ? "visible" : "hidden"}
        variants={overlayVariants}
      />

      {/* Ripple effect */}
      {showRipple && (
        <motion.div
          initial="initial"
          animate="animate"
          variants={rippleVariants}
          style={{
            position: 'absolute',
            top: ripplePosition.y,
            left: ripplePosition.x,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: color,
            zIndex: 1,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}

      {/* Link icon container with right padding */}
      <motion.div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 20px',
          position: 'relative',
          zIndex: 2,
        }}
        variants={iconVariants}
      >
        {/* Optional text */}
        {text && (
          <span style={{ 
            marginRight: 10, 
            color, 
            fontWeight: 500,
            fontSize: Math.max(size * 0.5, 14)
          }}>
            {text}
          </span>
        )}

        {/* External link icon */}
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14" 
            stroke={color} 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M14 4H20V10" 
            stroke={color} 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M20 4L10 14" 
            stroke={color} 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </motion.div>
  );
};

export default LinkButton;
