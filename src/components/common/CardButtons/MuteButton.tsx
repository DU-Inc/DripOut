import React, { useState } from 'react';
import { motion } from 'framer-motion';

export type MuteButtonProps = {
  /** Initial mute state */
  initialMuted?: boolean;
  /** Position of the optional text label */
  textPosition?: 'up' | 'down' | 'left' | 'right';
  /** Optional text to display */
  text?: string;
  /** Size of the button (in pixels) */
  size?: number;
  /** Primary color for the button */
  color?: string;
  /** Secondary color for the button (used for the mute slash) */
  accentColor?: string;
  /** Optional additional className */
  className?: string;
  /** Callback for mute state changes */
  onToggle?: (isMuted: boolean) => void;
};

const MuteButton: React.FC<MuteButtonProps> = ({
  initialMuted = false,
  textPosition = 'right',
  text,
  size = 24,
  color = '#111',
  accentColor = '#ff3b30',
  className = '',
  onToggle,
}) => {
  const [isMuted, setIsMuted] = useState(initialMuted);

  const handleToggle = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    if (onToggle) onToggle(newState);
  };

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
    fontSize: Math.max(size * 0.5, 12),
    fontWeight: 500,
    cursor: 'pointer',
  };

  // Button animation variants
  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  // Slash animation variants
  const slashVariants = {
    muted: { 
      opacity: 1,
      pathLength: 1,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    unmuted: { 
      opacity: 0,
      pathLength: 0,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  };

  // Ripple effect when toggling
  const rippleVariants = {
    initial: { scale: 0, opacity: 0.7 },
    animate: { 
      scale: 1.5, 
      opacity: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div 
      style={containerStyle} 
      className={className}
      role="button"
      aria-pressed={isMuted}
      aria-label={isMuted ? "Unmute" : "Mute"}
    >
      <motion.div
        style={{ position: 'relative' }}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        onClick={handleToggle}
      >
        {/* Background ripple effect */}
        {isMuted && (
          <motion.div
            initial="initial"
            animate="animate"
            variants={rippleVariants}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: accentColor,
              transform: 'translate(-50%, -50%)',
              zIndex: -1,
            }}
          />
        )}

        {/* Sound icon */}
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            d="M12 5L8 9H4V15H8L12 19V5Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <motion.path
            d="M16 9C17.66 10.657 17.66 13.343 16 15"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <motion.path
            d="M19 6C22.183 9.182 22.183 14.818 19 18"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Slash for mute state */}
          <motion.path
            d="M3 3L21 21"
            stroke={accentColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={isMuted ? "muted" : "unmuted"}
            animate={isMuted ? "muted" : "unmuted"}
            variants={slashVariants}
          />
        </svg>
      </motion.div>

      {/* Optional text */}
      {text && <span>{text}</span>}
    </div>
  );
};

export default MuteButton;
