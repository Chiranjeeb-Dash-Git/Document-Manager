import { motion, AnimatePresence } from 'framer-motion';
import { FileSignature } from 'lucide-react';

interface SplashProps {
  onEnter: () => void;
}

export default function Splash({ onEnter }: SplashProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="splash-screen"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      >
        {/* Deep violet orb - top right */}
        <div className="splash-orb splash-orb-1" />
        {/* Deep blue orb - bottom left */}
        <div className="splash-orb splash-orb-2" />
        {/* Crimson center pulse */}
        <div className="splash-orb splash-orb-3" />

        {/* Subtle grid overlay */}
        <div className="splash-grid" />

        {/* Thin top line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(109,40,217,0.8) 30%, rgba(168,85,247,1) 50%, rgba(109,40,217,0.8) 70%, transparent 100%)',
          boxShadow: '0 0 30px 4px rgba(168,85,247,0.5)',
          zIndex: 20,
        }} />

        {/* Content */}
        <div className="splash-content">

          {/* Logo icon */}
          <motion.div
            className="splash-logo"
            initial={{ scale: 0, rotate: -180, filter: 'blur(20px)' }}
            animate={{ scale: 1, rotate: 0, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.2 }}
            style={{
              background: 'linear-gradient(135deg, #6d28d9, #4c1d95)',
              boxShadow: '0 0 40px rgba(109,40,217,0.6), 0 0 80px rgba(109,40,217,0.3), 0 0 0 1px rgba(167,139,250,0.2)',
              border: '1px solid rgba(167,139,250,0.3)',
            }}
          >
            <FileSignature className="splash-logo-icon" style={{ width: '48px', height: '48px' }} />
          </motion.div>

          {/* Title */}
          <motion.h1
            className="splash-title"
            initial={{ opacity: 0, y: 60, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'linear-gradient(160deg, #ffffff 0%, #c4b5fd 45%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.04em',
            }}
          >
            Document Manager
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="splash-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: '1rem',
              color: 'rgba(196, 181, 253, 0.5)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Your Digital Workspace
          </motion.p>

          {/* Divider */}
          <motion.div
            className="splash-divider"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(109,40,217,0.8), rgba(168,85,247,1), rgba(109,40,217,0.8), transparent)',
              boxShadow: '0 0 16px rgba(168,85,247,0.5)',
              height: '1px',
              width: '120px',
            }}
          />

          {/* Enter button */}
          <motion.button
            className="splash-btn"
            onClick={onEnter}
            initial={{ opacity: 0, y: 30, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{
              scale: 1.05,
              boxShadow: '0 0 50px rgba(109,40,217,0.7), 0 0 100px rgba(109,40,217,0.3)',
              borderColor: 'rgba(167,139,250,0.6)',
            }}
            whileTap={{ scale: 0.96 }}
            style={{
              background: 'linear-gradient(135deg, rgba(109,40,217,0.2), rgba(29,78,216,0.2))',
              border: '1px solid rgba(109,40,217,0.4)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 20px rgba(109,40,217,0.3)',
            }}
          >
            <span className="splash-btn-text" style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Enter Workspace</span>
            <motion.span
              className="splash-btn-arrow"
              animate={{ x: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              →
            </motion.span>
          </motion.button>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}
