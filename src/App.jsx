import { useState, useRef, useCallback, useEffect } from 'react';
import { STATES, STATE_ORB_TEXT, canTransition } from './lib/stateMachine';
import { useAudio }   from './hooks/useAudio';
import { useVoice }   from './hooks/useVoice';
import WaveCanvas     from './components/WaveCanvas';
import OrbRing        from './components/OrbRing';
import MicButton      from './components/MicButton';
import StatePanel     from './components/StatePanel';
import StateBadge     from './components/StateBadge';

export default function App() {
  const [state, setState]   = useState(STATES.IDLE);
  const [response, setResp] = useState('');
  const streamRef           = useRef(null);
  const voiceRef            = useRef(null);
  const interruptedRef      = useRef(false); // debounce INTERRUPTED trigger

  const { smoothed, rmsRef, tick, startMic, stopMic, isActive } = useAudio();

  // Safe state transition
  const go = useCallback((next) => {
    setState(cur => canTransition(cur, next) ? next : cur);
  }, []);

  // Transcript → THINKING → chat SSE → RESPONDING → TTS → LISTENING
  const handleTranscript = useCallback(async (text) => {
    go(STATES.THINKING);
    setResp('');
    let full = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(`chat ${res.status}`);

      go(STATES.RESPONDING);
      const reader = res.body.getReader();
      const dec    = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value).split('\n').filter(l => l.startsWith('data:'));
        for (const line of lines) {
          const d = line.slice(5).trim();
          if (d === '[DONE]') break;
          try {
            const parsed = JSON.parse(d);
            const chunk  = parsed.text ?? parsed.content
              ?? parsed.choices?.[0]?.delta?.content ?? '';
            if (chunk) { full += chunk; setResp(full); }
          } catch {}
        }
      }

      // TTS — cancelled externally if INTERRUPTED
      if (full.trim()) {
        const utt  = new SpeechSynthesisUtterance(full);
        utt.rate   = 1.05;
        utt.onend  = () => {
          // Only restart loop if we weren't interrupted mid-speech
          if (streamRef.current && !interruptedRef.current) {
            go(STATES.LISTENING);
            voiceRef.current?.startListening(streamRef.current);
          } else if (!interruptedRef.current) {
            go(STATES.IDLE);
          }
        };
        utt.onerror = () => {
          if (!interruptedRef.current) go(STATES.IDLE);
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utt);
      } else {
        go(STATES.LISTENING);
      }
    } catch (err) {
      console.error('[App] chat error:', err);
      go(STATES.ERROR);
    }
  }, [go]);

  const { startListening, stopListening, checkSilence } = useVoice({
    onFinalTranscript: handleTranscript,
    onStateChange: go,
    rmsRef,
  });

  useEffect(() => {
    voiceRef.current = { startListening, stopListening, checkSilence };
  }, [startListening, stopListening, checkSilence]);

  // Mic button
  const handleMicClick = useCallback(async () => {
    if (state === STATES.IDLE || state === STATES.ERROR) {
      try {
        const stream = await startMic();
        streamRef.current = stream;
        go(STATES.LISTENING);
        startListening(stream);
      } catch {
        go(STATES.ERROR);
      }
    } else {
      window.speechSynthesis.cancel();
      stopListening();
      stopMic();
      streamRef.current = null;
      interruptedRef.current = false;
      setState(STATES.IDLE);
      setResp('');
    }
  }, [state, startMic, stopMic, startListening, stopListening, go]);

  // rAF tick: audio analysis + silence detection + INTERRUPTED detection
  const fullTick = useCallback(() => {
    if (tick) tick();
    const rms = rmsRef.current ?? 0;

    // LISTENING → SPEAKING when voice detected
    if (state === STATES.LISTENING && rms > 0.025) go(STATES.SPEAKING);

    // SPEAKING → silence detection
    if (state === STATES.SPEAKING) checkSilence(rms);

    // RESPONDING + new voice = INTERRUPTED — cut TTS, restart listening
    if (state === STATES.RESPONDING && rms > 0.032 && !interruptedRef.current) {
      interruptedRef.current = true;
      window.speechSynthesis.cancel();
      go(STATES.INTERRUPTED);

      // Brief INTERRUPTED flash, then drop into LISTENING + restart recording
      setTimeout(() => {
        interruptedRef.current = false;
        if (streamRef.current) {
          go(STATES.LISTENING);
          voiceRef.current?.startListening(streamRef.current);
        }
      }, 350);
    }
  }, [tick, state, rmsRef, checkSilence, go]);

  const orbText = STATE_ORB_TEXT[state] ?? { line1: '', line2: '' };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden select-none">

      {/* State badge — top left */}
      <StateBadge state={state} />

      {/* Ribbon waveform wings — full width, behind everything */}
      <WaveCanvas
        state={state}
        smoothed={smoothed}
        rmsRef={rmsRef}
        tick={fullTick}
        isActive={isActive}
      />

      {/* Center: orb + text + response */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-4">
        <OrbRing state={state} rmsRef={rmsRef} smoothed={smoothed} />

        {orbText.line1 && (
          <div className="text-center mt-2">
            <p className="text-[20px] font-medium tracking-tight">{orbText.line1}</p>
            {orbText.line2 && (
              <p className="text-sm text-white/50 mt-1">{orbText.line2}</p>
            )}
          </div>
        )}

        {response && (
          <p className="max-w-sm text-center text-white/75 text-sm leading-relaxed px-6">
            {response}
          </p>
        )}
      </div>

      {/* Mic button */}
      <MicButton state={state} onClick={handleMicClick} isActive={isActive} />

      {/* State cards */}
      <StatePanel state={state} smoothed={smoothed} rms={rmsRef.current ?? 0} />
    </div>
  );
}
