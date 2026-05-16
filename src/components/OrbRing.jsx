import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { STATE_COLORS, STATE_GLOW, STATE_PHASE_SPEED } from '../lib/stateMachine';
import { drawOrbDots } from '../lib/ribbonMath';

/**
 * OrbRing.jsx — glowing SVG ring + reactive dot ring canvas overlay
 * smoothed: Float32Array(64) mutated in place — always current in rAF loop
 * rmsRef:   React ref — always current (no stale closure)
 */

const STATE_DOT_RGBA = {
  IDLE:        'rgba(85,85,85,',
  LISTENING:   'rgba(0,212,255,',
  SPEAKING:    'rgba(79,139,255,',
  THINKING:    'rgba(155,123,255,',
  RESPONDING:  'rgba(233,30,140,',
  INTERRUPTED: 'rgba(255,107,157,',
  ERROR:       'rgba(239,68,68,',
};

const ORB_SIZE = 340;

export default function OrbRing({ state, rmsRef, smoothed }) {
  const color     = STATE_COLORS[state]   ?? '#555555';
  const glow      = STATE_GLOW[state]     ?? 6;
  const isActive  = !['IDLE', 'ERROR'].includes(state);

  // RMS-driven ring stroke pulse (read from ref to stay current)
  const rms = rmsRef?.current ?? 0;
  const strokeW = 2.5 + rms * 6;

  // Canvas overlay — reactive dot ring
  const canvasRef  = useRef(null);
  const phaseRef   = useRef(0);
  const stateRef   = useRef(state);
  const smoothedRef = useRef(smoothed);

  useEffect(() => { stateRef.current   = state;   }, [state]);
  useEffect(() => { smoothedRef.current = smoothed; }, [smoothed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = ORB_SIZE;
    canvas.height = ORB_SIZE;
    const ctx = canvas.getContext('2d', { alpha: true });
    let rafId;

    const loop = () => {
      const s    = stateRef.current;
      const spd  = STATE_PHASE_SPEED[s] ?? 0.012;
      phaseRef.current += spd;

      const dotColor = STATE_DOT_RGBA[s] ?? STATE_DOT_RGBA.LISTENING;
      const sm = smoothedRef.current || new Float32Array(64);
      drawOrbDots(ctx, sm, phaseRef.current, ORB_SIZE, ORB_SIZE, dotColor);

      rafId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(rafId);
  }, []); // stable loop — reads state/smoothed via refs

  return (
    <div className="relative flex items-center justify-center" style={{ width: ORB_SIZE, height: ORB_SIZE }}>

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
      <svg width={ORB_SIZE} height={ORB_SIZE} className="absolute">
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
            cx={ORB_SIZE / 2} cy={ORB_SIZE / 2}
            r={130 + i * 16}
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            opacity={0.06 - i * 0.01}
          />
        ))}

        {/* Main ring */}
        <motion.circle
          cx={ORB_SIZE / 2} cy={ORB_SIZE / 2} r="130"
          fill="none"
          stroke="url(#orbGrad)"
          strokeWidth={strokeW}
          strokeLinecap="round"
          filter="url(#glow)"
          animate={{ r: 130 + rms * 8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </svg>

      {/* Reactive dot ring — canvas overlay */}
      <canvas
        ref={canvasRef}
        width={ORB_SIZE}
        height={ORB_SIZE}
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

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
