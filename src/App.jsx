import { useState } from 'react';
import WaveCanvas from './components/WaveCanvas';
import { STATES } from './lib/stateMachine';

/**
 * App.jsx - Top level for Voice Orb
 * Temporary state for testing WaveCanvas + audio
 */
export default function App() {
  const [state, setState] = useState(STATES.LISTENING);
  // TODO: replace with real useAudio + state machine
  const dummySmoothed = new Float32Array(64).fill(0.25);
  const dummyRMS = 0.35;

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Waveform wings - full width */}
      <WaveCanvas 
        state={state} 
        smoothed={dummySmoothed} 
        rms={dummyRMS} 
        tick={() => {}}
        isActive={true}
      />

      {/* Placeholder orb area */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="text-center">
          <div className="text-2xl font-medium tracking-tight">I'm listening</div>
          <div className="text-sm text-white/60 mt-1">Speak naturally</div>
        </div>
      </div>

      {/* Temp state switcher for testing */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-2">
        {Object.values(STATES).map(s => (
          <button
            key={s}
            onClick={() => setState(s)}
            className={`px-3 py-1 text-xs rounded-full border ${state === s ? 'bg-white text-black' : 'border-white/30'}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}