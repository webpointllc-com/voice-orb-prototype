import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { STATE_PHASE_SPEED } from '../lib/stateMachine';
import { drawOrbDots } from '../lib/ribbonMath';

const GLOW_COLORS = {
  IDLE:        '#555555',
  LISTENING:   '#00D4FF',
  SPEAKING:    '#4F8BFF',
  THINKING:    '#9B7BFF',
  RESPONDING:  '#E91E8C',
  INTERRUPTED: '#FF6B9D',
  ERROR:       '#EF4444',
};

const DOT_RGBA = {
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
  const glow        = GLOW_COLORS[state] ?? GLOW_COLORS.LISTENING;
  const isActive    = !['IDLE', 'ERROR'].includes(state);
  const rms         = rmsRef?.current ?? 0;

  // Siri-grade dynamic glow per state
  let glowSize = 80 + rms * 120;
  let glowOpacity = 0.55 + rms * 0.45;

  if (state === 'SPEAKING') { glowSize = 100 + rms * 145; glowOpacity = 0.7 + rms * 0.5; }
  if (state === 'RESPONDING') { glowSize = 88 + rms * 115; glowOpacity = 0.62 + rms * 0.42; }
  if (state === 'THINKING') { glowSize = 78 + rms * 100; glowOpacity = 0.52 + rms * 0.38; }
  if (state === 'ERROR') { glowSize = 130; glowOpacity = 0.95; }

  const canvasRef   = useRef(null);
  const phaseRef    = useRef(0);
  const stateRef    = useRef(state);
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
      const s   = stateRef.current;
      const spd = STATE_PHASE_SPEED[s] ?? 0.012;
      phaseRef.current += spd;
      drawOrbDots(ctx, smoothedRef.current || new Float32Array(64), phaseRef.current, ORB_SIZE, ORB_SIZE, DOT_RGBA[s] ?? DOT_RGBA.LISTENING);
      rafId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: ORB_SIZE, height: ORB_SIZE }}
      key={state}
      initial={{ scale: 0.96, opacity: 0.85 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute w-[340px] h-[340px] rounded-full border border-white/10 pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] rounded-full border border-white/10 pointer-events-none" />

      <div
        className="w-[240px] h-[240px] rounded-full relative"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #ffffff33, transparent 65%), linear-gradient(145deg, #1a1a2e, #0f0f1a)',
          boxShadow: `0 0 ${glowSize}px ${glow}${Math.round(glowOpacity * 99).toString(16).padStart(2,'0')}, inset 50px 50px 80px rgba(255,255,255,0.12), inset -50px -50px 80px rgba(0,0,0,0.7)`,
          transition: 'box-shadow 0.12s ease-out',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent rounded-full" />
      </div>

      <canvas
        ref={canvasRef}
        width={ORB_SIZE}
        height={ORB_SIZE}
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {isActive && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 80, height: 80,
            background: `radial-gradient(circle, ${glow}40 0%, transparent 70%)`,
          }}
          animate={{ opacity: [0.4, 0.85, 0.4], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  );
}
