import { motion } from 'framer-motion';
import { STATE_COLORS, STATE_GLOW, STATE_ORB_TEXT } from '../lib/stateMachine';

/**
 * OrbRing.jsx — glowing SVG ring, state-aware colors + glow
 */
export default function OrbRing({ state, rms }) {
  const color   = STATE_COLORS[state]   ?? '#555555';
  const glow    = STATE_GLOW[state]     ?? 6;
  const orbText = STATE_ORB_TEXT[state] ?? { line1: '', line2: '' };
  const isActive = !['IDLE', 'ERROR'].includes(state);

  // RMS-driven ring distortion (subtle strokeWidth pulse)
  const strokeW = 2.5 + (rms ?? 0) * 6;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 340, height: 340 }}>

      {/* Outer glow corona */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          boxShadow: isActive
            ? `0 0 ${glow * 5}px ${color}44, 0 0 ${glow * 12}px ${color}22`
            : 'none',
        }}
        transition={{ duration: 0.5 }}
      />

      {/* SVG ring */}
      <svg width="340" height="340" className="absolute">
        <defs>
          <linearGradient id="orbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#9B7BFF" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={glow} result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Ghost sonar rings */}
        {[1, 2, 3].map((i) => (
          <circle
            key={i}
            cx="170" cy="170"
            r={130 + i * 16}
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            opacity={0.06 - i * 0.01}
          />
        ))}

        {/* Main ring */}
        <motion.circle
          cx="170" cy="170" r="130"
          fill="none"
          stroke="url(#orbGrad)"
          strokeWidth={strokeW}
          strokeLinecap="round"
          filter="url(#glow)"
          animate={{ r: 130 + (rms ?? 0) * 8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </svg>

      {/* Center inner glow pulse when active */}
      {isActive && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 100, height: 100,
            background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
          }}
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}
