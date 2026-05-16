import React from 'react';

export default function OrbRing({ state = 'LISTENING' }) {
  const glowColors = {
    LISTENING: '#3b82f6',
    YOU_SPEAKING: '#60a5fa',
    THINKING: '#a855f7',
    AI_RESPONDING: '#ec4899',
    INTERRUPTED: '#ef4444',
  };

  const glow = glowColors[state] || '#3b82f6';

  return (
    <div className="relative flex items-center justify-center w-[280px] h-[280px]">
      {/* Subtle outer rings */}
      <div className="absolute w-[340px] h-[340px] rounded-full border border-white/10" />
      <div className="absolute w-[300px] h-[300px] rounded-full border border-white/10" />

      {/* Main glowing orb */}
      <div
        className="w-[240px] h-[240px] rounded-full relative"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #ffffff33, transparent 65%), linear-gradient(145deg, #1a1a2e, #0f0f1a)',
          boxShadow: `0 0 110px ${glow}, inset 50px 50px 80px rgba(255,255,255,0.12), inset -50px -50px 80px rgba(0,0,0,0.7)`
        }}
      >
        {/* Inner highlight */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent rounded-full" />

        {/* Thinking orbiting dots */}
        {state === 'THINKING' && (
          Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-[5px] h-[5px] bg-purple-400 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                animation: `orbit 2.4s linear infinite`,
                animationDelay: `-${i * 0.27}s`,
                transformOrigin: '0 0',
              }}
            />
          ))
        )}
      </div>

      {/* Center text */}
      <div className="absolute text-center z-10">
        <div className="text-[22px] font-semibold tracking-[-0.4px] text-white">
          {state === 'LISTENING' && "I'm Listening"}
          {state === 'YOU_SPEAKING' && "Listening..."}
          {state === 'THINKING' && "Thinking"}
          {state === 'AI_RESPONDING' && "Speaking"}
          {state === 'INTERRUPTED' && "Interrupted"}
        </div>
        <div className="text-[13px] text-white/60 mt-0.5 tracking-[-0.2px]">
          {state === 'LISTENING' && "Speak naturally"}
          {state === 'YOU_SPEAKING' && "Release when done"}
          {state === 'THINKING' && "Processing voice"}
          {state === 'AI_RESPONDING' && "One moment"}
        </div>
      </div>
    </div>
  );
}