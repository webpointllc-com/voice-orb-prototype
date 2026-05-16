import React, { useEffect, useRef } from 'react';

export default function WaveCanvas({ state = 'LISTENING', rms = 0.25 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let raf;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const y = h / 2;

      ctx.strokeStyle = state === 'AI_RESPONDING' ? '#ec4899' :
                       state === 'THINKING' ? '#a855f7' :
                       state === 'YOU_SPEAKING' ? '#3b82f6' : '#60a5fa';
      ctx.lineWidth = 2.6;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 26;

      ctx.beginPath();
      const points = 56;
      const baseAmp = state === 'YOU_SPEAKING' ? 34 : 19;
      const amp = baseAmp * (0.65 + rms * 1.1);

      for (let i = 0; i <= points; i++) {
        const x = (i / points) * w;
        const phase = (i * 0.78) + (Date.now() / 145);
        const wave = Math.sin(phase) * amp * (1 + Math.sin(phase * 0.4) * 0.25);
        const yPos = y + wave * (i % 5 === 0 ? 1.12 : 0.96);
        if (i === 0) ctx.moveTo(x, yPos);
        else ctx.lineTo(x, yPos);
      }
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [state, rms]);

  return <canvas ref={canvasRef} width={420} height={72} className="mx-auto" />;
}