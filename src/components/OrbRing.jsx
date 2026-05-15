import { motion } from 'framer-motion';

/**
 * OrbRing.jsx
 * The main glowing ring + concentric sonar rings + centered text.
 * Pure SVG + Framer Motion for smooth state transitions.
 */
export default function OrbRing({ state, isListening }) {
  const isActive = ['LISTENING', 'SPEAKING', 'THINKING', 'RESPONDING'].includes(state);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 420, height: 420 }}>
      {/* Outer glow layers */}
      <div className="absolute inset-0 rounded-full"
           style={{
             boxShadow: isActive 
               ? '0 0 80px rgba(79,139,255,0.25), 0 0 140px rgba(155,123,255,0.15)' 
               : 'none',
             transition: 'box-shadow 0.4s ease'
           }} 
      />

      {/* Main ring */}
      <svg width="420" height="420" className="absolute">
        <defs>
          <linearGradient id="orbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F8BFF" />
            <stop offset="100%" stopColor="#9B7BFF" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Main ring */}
        <circle
          cx="210" cy="210" r="160"
          fill="none"
          stroke="url(#orbGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#glow)"
        />

        {/* Concentric ghost rings (sonar) */}
        {[1,2,3,4].map((i) => (
          <circle
            key={i}
            cx="210" cy="210"
            r={160 + i * 18}
            fill="none"
            stroke="white"
            strokeWidth="1"
            opacity={0.08}
          />
        ))}
      </svg>

      {/* Center text */}
      <div className="relative z-10 text-center">
        <div className="text-[22px] font-medium tracking-[-0.3px]">I'm listening</div>
        <div className="text-[14px] text-white/60 mt-1">Speak naturally</div>
      </div>

      {/* Subtle inner glow when active */}
      {isActive && (
        <motion.div
          className="absolute inset-[70px] rounded-full"
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.25) 0%, transparent 70%)' }}
        />
      )}
    </div>
  );
}