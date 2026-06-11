import { useMemo } from 'react';

interface ParticlesProps {
  count?: number;
}

export default function Particles({ count = 120 }: ParticlesProps) {
  const particles = useMemo(() => {
    const colors = [
      'rgba(167, 139, 250, 1)',    // violet
      'rgba(109, 40, 217, 1)',     // deep violet
      'rgba(139, 92, 246, 1)',     // purple
      'rgba(99, 102, 241, 1)',     // indigo
      'rgba(59, 130, 246, 1)',     // blue
      'rgba(251, 191, 36, 1)',     // amber fire
      'rgba(249, 115, 22, 0.9)',   // orange fire
      'rgba(239, 68, 68, 0.7)',    // red spark
      'rgba(255, 255, 255, 0.9)',  // white spark
      'rgba(196, 181, 253, 1)',    // lavender
      'rgba(6, 182, 212, 0.8)',    // cyan
    ];

    return Array.from({ length: count }, (_, i) => {
      const size = Math.random() > 0.88 ? 7 : Math.random() > 0.65 ? 4 : Math.random() > 0.4 ? 3 : 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const isSquare = size >= 6 && Math.random() > 0.5;
      const glowSize = size * 5;
      const duration = Math.random() * 5 + 3;
      const delay = Math.random() * 8;
      const left = Math.random() * 100;
      const bottom = -(Math.random() * 15);
      const riseHeight = -(Math.random() * 1000 + 300);
      const driftX = (Math.random() - 0.5) * 160;
      const rotate = Math.random() * 360;

      return {
        id: i,
        size,
        color,
        isSquare,
        glowSize,
        duration,
        delay,
        left,
        bottom,
        style: {
          '--rise-y': `${riseHeight}px`,
          '--drift-x': `${driftX}px`,
          '--rot': `${rotate}deg`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
        } as React.CSSProperties
      };
    });
  }, [count]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        // Make sure it doesn't cause repaint issues
        willChange: 'transform',
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="css-particle"
          style={{
            ...p.style,
            position: 'absolute',
            left: `${p.left}%`,
            bottom: `${p.bottom}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: p.isSquare ? '2px' : '50%',
            background: p.color,
            // Removed heavy box-shadow for buttery smooth performance
          }}
        />
      ))}
    </div>
  );
}
