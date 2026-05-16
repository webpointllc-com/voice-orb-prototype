import { useRef, useEffect } from 'react';
import { drawRibbons, drawThinkingMini } from '../lib/ribbonMath';
import { STATE_AMP_MULT, STATE_PHASE_SPEED } from '../lib/stateMachine';

/**
 * StateCard.jsx — mini ribbon canvas per state
 * THINKING uses drawThinkingMini (orbiting dots), all others use drawRibbons
 */
export default function StateCard({ label, color, isActive, state }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let phase = 0;
    let raf;

    // Dummy frequency data for mini card
    const dummySmoothed = new Float32Array(64).fill(isActive ? 0.35 : 0.08);
    const phaseSpeed    = STATE_PHASE_SPEED[state] ?? 0.01;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;

      if (state === 'THINKING') {
        drawThinkingMini(ctx, phase, W, H);
      } else {
        drawRibbons(ctx, dummySmoothed, isActive ? 0.3 : 0.05, phase, state, W, H);
      }

      phase += phaseSpeed;
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [isActive, state]);

  return (
    <div
      className={`p-3 rounded-2xl border transition-all duration-300 ${
        isActive ? 'border-white/40 bg-white/5' : 'border-white/10 bg-transparent'
      }`}
    >
      <div
        className="text-[9px] font-mono tracking-[1.5px] mb-2 uppercase"
        style={{ color: isActive ? color : '#555' }}
      >
        {label}
      </div>
      <canvas ref={canvasRef} width={150} height={48} className="w-full rounded" />
      {isActive && (
        <div className="flex justify-end mt-1">
          <span className="text-[9px] font-mono" style={{ color }}>●</span>
        </div>
      )}
    </div>
  );
}
