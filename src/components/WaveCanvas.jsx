import { useRef, useEffect } from 'react';
import { drawRibbons } from '../lib/ribbonMath';
import { STATE_PHASE_SPEED } from '../lib/stateMachine';

/**
 * WaveCanvas.jsx — full-width ribbon waveform wings
 *
 * CRITICAL: tick prop = fullTick from App.jsx.
 * It MUST be called inside the rAF loop — it drives:
 *   - useAudio frequency analysis (updates smoothed + rmsRef)
 *   - LISTENING → SPEAKING detection
 *   - Silence detection (SPEAKING → THINKING)
 *   - INTERRUPTED detection (RESPONDING + new speech)
 * Without calling tick(), the entire voice loop is dead.
 *
 * Props:
 *   state     — current app state string
 *   smoothed  — Float32Array(64) mutated in place by tick()
 *   rmsRef    — React ref, .current = live RMS value
 *   tick      — fullTick from App.jsx (MUST be called every frame)
 *   isActive  — bool (mic is open)
 */
export default function WaveCanvas({ state, smoothed, rmsRef, tick, isActive }) {
  const canvasRef   = useRef(null);
  const phaseRef    = useRef(0);
  const stateRef    = useRef(state);
  const smoothedRef = useRef(smoothed);

  useEffect(() => { stateRef.current   = state;   }, [state]);
  useEffect(() => { smoothedRef.current = smoothed; }, [smoothed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let rafId;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = 220;
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      // ── CRITICAL: call tick every frame ──────────────────────────────
      // This updates smoothed bins, rmsRef.current, and runs all state
      // transition logic (silence detection, INTERRUPTED, SPEAKING).
      // Removing this call breaks the entire voice loop.
      if (tick) tick();
      // ─────────────────────────────────────────────────────────────────

      const W   = canvas.width;
      const H   = canvas.height;
      const s   = stateRef.current;
      const rms = rmsRef?.current ?? 0;
      const spd = STATE_PHASE_SPEED[s] ?? 0.012;

      phaseRef.current += spd;
      drawRibbons(
        ctx,
        smoothedRef.current || new Float32Array(64),
        rms,
        phaseRef.current,
        s,
        W,
        H
      );

      rafId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [tick, rmsRef]); // only restart if tick/rmsRef identity changes — state+smoothed via refs

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
      style={{ height: '220px' }}
    />
  );
}
