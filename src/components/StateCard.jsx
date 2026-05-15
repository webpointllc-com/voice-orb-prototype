import { useRef, useEffect } from 'react';

/**
 * StateCard.jsx
 * Individual state card with mini looping waveform
 */
export default function StateCard({ label, color, isActive }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let raf;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = isActive ? color : '#555';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 3) {
        const y = canvas.height / 2 + Math.sin((x + frame) * 0.08) * 12 * (isActive ? 1 : 0.3);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      frame += 1.2;
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [isActive, color]);

  return (
    <div className={`p-4 rounded-2xl border transition-all ${isActive ? 'border-white/40 bg-white/5' : 'border-white/10 bg-white/3'}`}>
      <div className="text-[10px] font-mono tracking-[1px] mb-2" style={{ color: isActive ? color : '#888' }}>
        {label}
      </div>
      <canvas ref={canvasRef} width={150} height={50} className="w-full" />
      <div className="text-right text-white/30 mt-1">
        <span className="text-[10px]">···</span>
      </div>
    </div>
  );
}