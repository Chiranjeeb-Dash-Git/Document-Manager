import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileSignature, Wrench, ArrowRight, Lock } from 'lucide-react';

export default function Hub() {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Signature Manager',
      desc: 'Upload, sign, and manage your PDF documents with digital signatures.',
      icon: FileSignature,
      gradient: 'linear-gradient(135deg, #6d28d9, #4c1d95)',
      glow: 'rgba(109, 40, 217, 0.5)',
      glowColor: '#6d28d9',
      accentColor: '#a78bfa',
      path: '/dashboard',
    },
    {
      title: 'Tools',
      desc: 'Convert documents and images between formats instantly.',
      icon: Wrench,
      gradient: 'linear-gradient(135deg, #1d4ed8, #1e3a8a)',
      glow: 'rgba(29, 78, 216, 0.5)',
      glowColor: '#1d4ed8',
      accentColor: '#60a5fa',
      path: '/convert',
    },
    {
      title: 'Secure Vault',
      desc: 'Private, PIN-protected storage for your sensitive photos and documents.',
      icon: Lock,
      gradient: 'linear-gradient(135deg, #be123c, #881337)',
      glow: 'rgba(190, 18, 60, 0.5)',
      glowColor: '#be123c',
      accentColor: '#fb7185',
      path: '/safe',
    },
  ];

  return (
    <div className="cin-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <motion.h1
        className="hub-title"
        style={{ 
          fontSize: '3.5rem', 
          fontWeight: 900,
          textAlign: 'center', 
          marginBottom: '0.75rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #818cf8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
        }}
        initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        Welcome Back
      </motion.h1>
      <motion.p
        className="hub-subtitle"
        style={{ 
          textAlign: 'center', 
          marginBottom: '4rem', 
          fontSize: '1.1rem',
          color: 'rgba(196, 181, 253, 0.6)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        Choose your workspace
      </motion.p>

      <div className="hub-cards-container" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            className="hub-card"
            onClick={() => navigate(card.path)}
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -14, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              width: '320px',
              padding: '2.5rem 2rem',
              borderRadius: '28px',
              background: 'linear-gradient(145deg, rgba(10, 5, 25, 0.9), rgba(5, 2, 15, 0.95))',
              backdropFilter: 'blur(40px)',
              border: `1px solid rgba(255, 255, 255, 0.07)`,
              boxShadow: `0 0 0 1px rgba(255,255,255,0.04) inset, 0 30px 60px rgba(0,0,0,0.7)`,
              cursor: 'pointer',
              transition: 'all 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = `${card.glowColor}50`;
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${card.glowColor}30 inset, 0 40px 80px rgba(0,0,0,0.8), 0 0 60px ${card.glow}`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255, 255, 255, 0.07)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.04) inset, 0 30px 60px rgba(0,0,0,0.7)';
            }}
          >
            {/* Corner glow */}
            <div style={{
              position: 'absolute',
              top: '-60px',
              right: '-60px',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${card.glow} 0%, transparent 70%)`,
              pointerEvents: 'none',
              opacity: 0.6,
            }} />

            {/* Bottom shimmer */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: `linear-gradient(90deg, transparent, ${card.glowColor}60, transparent)`,
            }} />

            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: card.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.75rem',
              boxShadow: `0 0 25px ${card.glow}, 0 0 50px ${card.glow}50`,
              border: '1px solid rgba(255,255,255,0.15)',
              position: 'relative',
            }}>
              <card.icon style={{ width: '30px', height: '30px', color: 'white' }} />
            </div>

            <h2 style={{ color: 'rgba(255,255,255,0.95)', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.6rem', position: 'relative', letterSpacing: '-0.01em' }}>
              {card.title}
            </h2>
            <p style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: '0.93rem', lineHeight: 1.7, margin: '0 0 1.75rem', position: 'relative' }}>
              {card.desc}
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: card.accentColor,
              fontWeight: 600,
              fontSize: '0.88rem',
              position: 'relative',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              Open
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowRight style={{ width: '15px', height: '15px' }} />
              </motion.span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
