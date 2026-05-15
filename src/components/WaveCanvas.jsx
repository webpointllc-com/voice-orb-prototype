import { useRef, useEffect } from 'react';
import { drawRibbons } from '../lib/ribbonMath';

/**
 * WaveCanvas.jsx
 * Full-width ribbon waveform using drawRibbons from ribbonMath.js
 * Wires useAudio tick() into rAF loop.
 */
export default function WaveCanvas({ state, smoothed, rms, tick, isActive }) {
  const canvasRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let rafId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 220; // matches design intent
    };

    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      if (tick) tick();

      const W = canvas.width;
      const H = canvas.height;
      const currentRMS = rms ?? 0;

      // Advance phase based on state for different "feels"
      const phaseSpeed = state === 'LISTENING' ? 0.028 : 
                        state === 'SPEAKING' ? 0.035 : 
                        state === 'THINKING' ? 0.018 : 0.022;
      phaseRef.current += phaseSpeed;

      drawRibbons(ctx, smoothed || new Float32Array(64), currentRMS, phaseRef.current, state, W, H);

      rafId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [state, smoothed, rms, tick]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
      style={{ height: '220px' }}
    />
  );
}