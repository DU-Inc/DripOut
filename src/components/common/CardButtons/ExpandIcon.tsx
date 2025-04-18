/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export type ExpandIconProps = {
  /** Whether the video is in expanded state */
  isExpanded?: boolean;
  /** Callback when expand state is toggled */
  onToggle?: (isExpanded: boolean) => void;
  /** Size of the button (in pixels) */
  size?: number;
  /** Primary color for the icon */
  color?: string;
  /** Background color for the icon */
  backgroundColor?: string;
  /** Background opacity (0-1) */
  backgroundOpacity?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Corner radius of the background */
  borderRadius?: number;
  /** Whether to show glow effect on hover */
  showGlowEffect?: boolean;
  /** Optional additional className */
  className?: string;
};

const ExpandIcon: React.FC<ExpandIconProps> = ({
  isExpanded = false,
  onToggle,
  size = 40,
  color = '#FFFFFF',
  backgroundColor = '#000000',
  backgroundOpacity = 0.5,
  animationDuration = 300,
  borderRadius = 8,
  showGlowEffect = true,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const [isHovered, setIsHovered] = useState(false);
  
  // Update state when prop changes
  useEffect(() => {
    setExpanded(isExpanded);
  }, [isExpanded]);

  // Container styles
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: borderRadius,
  };
  
  // Button animation variants
  const buttonVariants = {
    normal: { 
      scale: 1,
      backgroundColor: `rgba(${hexToRgb(backgroundColor)}, ${backgroundOpacity})`,
      boxShadow: '0px 0px 0px rgba(255, 255, 255, 0)',
      transition: { 
        duration: animationDuration / 1000,
        ease: "easeOut" 
      }
    },
    hover: { 
      scale: 1.05,
      backgroundColor: `rgba(${hexToRgb(backgroundColor)}, ${backgroundOpacity + 0.1})`,
      boxShadow: showGlowEffect ? `0px 0px ${size * 0.15}px rgba(255, 255, 255, 0.3)` : 'none',
      transition: { 
        duration: animationDuration / 1000,
        ease: "easeOut" 
      }
    },
    tap: { 
      scale: 0.95,
      backgroundColor: `rgba(${hexToRgb(backgroundColor)}, ${backgroundOpacity + 0.2})`,
      transition: { 
        duration: animationDuration / 1000 * 0.3,
        ease: "easeIn" 
      }
    }
  };

  // Corner animation variants
  const cornerVariants = {
    expanded: (corner: string) => {
      // Different transform for each corner
      const transforms = {
        'top-left': { x: -2, y: -2 },
        'top-right': { x: 2, y: -2 },
        'bottom-left': { x: -2, y: 2 },
        'bottom-right': { x: 2, y: 2 }
      };
      
      return {
        ...transforms[corner as keyof typeof transforms],
        rotate: 0,
        transition: { 
          duration: animationDuration / 1000 * 0.5,
          ease: "easeOut"
        }
      };
    },
    collapsed: (corner: string) => {
      // Different transform for each corner
      const transforms = {
        'top-left': { x: 2, y: 2 },
        'top-right': { x: -2, y: 2 },
        'bottom-left': { x: 2, y: -2 },
        'bottom-right': { x: -2, y: -2 }
      };
      
      return {
        ...transforms[corner as keyof typeof transforms],
        rotate: 0,
        transition: { 
          duration: animationDuration / 1000 * 0.5,
          ease: "easeOut"
        }
      };
    }
  };

  // Helper function to convert hex to RGB
  function hexToRgb(hex: string): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
  }

  // Toggle expanded state
  const toggleExpand = () => {
    const newState = !expanded;
    setExpanded(newState);
    
    if (onToggle) {
      onToggle(newState);
    }
  };

  return (
    <motion.div
      style={containerStyle}
      className={className}
      initial="normal"
      animate={isHovered ? "hover" : "normal"}
      whileTap="tap"
      variants={buttonVariants}
      onClick={toggleExpand}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      aria-pressed={expanded}
      aria-label={expanded ? "Exit full screen" : "Enter full screen"}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleExpand();
        }
      }}
    >
      {/* Center square */}
      <motion.div
        style={{
          width: size * 0.4,
          height: size * 0.4,
          border: `2px solid ${color}`,
          borderRadius: 2,
          position: 'absolute',
          opacity: expanded ? 1 : 0.6,
          transition: `opacity ${animationDuration / 1000}s ease`
        }}
        animate={{
          scale: expanded ? 0.7 : 1,
          transition: { 
            duration: animationDuration / 1000,
            ease: "easeInOut"
          }
        }}
      />
      
      {/* Corners/Arrows */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
        // Calculate position and rotation for each corner
        const positions = {
          'top-left': { top: size * 0.15, left: size * 0.15, rotate: -45 },
          'top-right': { top: size * 0.15, right: size * 0.15, rotate: 45 },
          'bottom-left': { bottom: size * 0.15, left: size * 0.15, rotate: -135 },
          'bottom-right': { bottom: size * 0.15, right: size * 0.15, rotate: 135 }
        };
        
        const position = positions[corner as keyof typeof positions];
        
        return (
          <motion.div
            key={corner}
            custom={corner}
            initial={expanded ? "expanded" : "collapsed"}
            animate={expanded ? "expanded" : "collapsed"}
            variants={cornerVariants}
            style={{
              position: 'absolute',
              ...position,
              width: size * 0.25,
              height: size * 0.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg 
              width={size * 0.2} 
              height={size * 0.2} 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ 
                transform: `rotate(${position.rotate}deg)`,
                transition: `transform ${animationDuration / 1000}s ease`
              }}
            >
              <path 
                d="M5 19L19 5M19 5H10M19 5V14" 
                stroke={color} 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default ExpandIcon;
