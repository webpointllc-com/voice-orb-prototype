import React, { useEffect, useRef } from 'react';

export default function WaveCanvas({ state = 'LISTENING', rms = 0.25 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const y = h / 2;

      ctx.strokeStyle = state === 'AI_RESPONDING' ? '#ec4899' :
                       state === 'THINKING' ? '#a855f7' :
                       state === 'YOU_SPEAKING' ? '#3b82f6' : '#60a5fa';
      ctx.lineWidth = 2.8;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 22;

      ctx.beginPath();
      const points = 52;
      const amp = (state === 'YOU_SPEAKING' ? 32 : 18) * (0.7 + rms * 0.9);

      for (let i = 0; i <= points; i++) {
        const x = (i / points) * w;
        const wave = Math.sin((i * 0.85) + (Date.now() / 160)) * amp;
        const yPos = y + wave * (i % 4 === 0 ? 1.15 : 0.95);
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