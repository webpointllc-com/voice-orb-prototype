import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STATES, STATE_ORB_TEXT, THINKING_LABELS, canTransition } from './lib/stateMachine';
import { useAudio }   from './hooks/useAudio';
import { useVoice }   from './hooks/useVoice';
import WaveCanvas     from './components/WaveCanvas';
import OrbRing        from './components/OrbRing';
import MicButton      from './components/MicButton';
import StatePanel     from './components/StatePanel';
import StateBadge     from './components/StateBadge';
import AuthGate              from './components/AuthGate';
import ConversationHistory   from './components/ConversationHistory';
import { saveConversation }  from './lib/db';

function VoiceApp({ user, onSignOut }) {
  const [state, setState]         = useState(STATES.IDLE);
  const [response, setResp]       = useState('');
  const [thinkingLabel, setThink] = useState('');
  const streamRef                 = useRef(null);
  const voiceRef                  = useRef(null);
  const interruptedRef            = useRef(false); // debounce INTERRUPTED trigger
  const thinkingTimerRef          = useRef(null);

  const { smoothed, rmsRef, tick, startMic, stopMic, isActive } = useAudio();

  // Safe state transition
  const go = useCallback((next) => {
    setState(cur => canTransition(cur, next) ? next : cur);
  }, []);

  // Cycle through thinking labels while in THINKING state
  const startThinkingCycle = useCallback(() => {
    let idx = 0;
    setThink(THINKING_LABELS[0]);
    thinkingTimerRef.current = setInterval(() => {
      idx = (idx + 1) % THINKING_LABELS.length;
      setThink(THINKING_LABELS[idx]);
    }, 1800);
  }, []);

  const stopThinkingCycle = useCallback(() => {
    clearInterval(thinkingTimerRef.current);
    thinkingTimerRef.current = null;
    setThink('');
  }, []);

  // Transcript → THINKING → chat SSE → RESPONDING → TTS → LISTENING
  const handleTranscript = useCallback(async (text) => {
    go(STATES.THINKING);
    setResp('');
    startThinkingCycle();
    let full = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(`chat ${res.status}`);

      stopThinkingCycle();
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

      // Persist conversation to IndexedDB
      if (full.trim() && user?.id) {
        saveConversation({ userId: user.id, transcript: text, response: full, durationMs: Date.now() }).catch(() => {});
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
      stopThinkingCycle();
      go(STATES.ERROR);
    }
  }, [go, startThinkingCycle, stopThinkingCycle]);

  const { startListening, stopListening, checkSilence } = useVoice({
    onFinalTranscript: handleTranscript,
    onStateChange: go,
    rmsRef,
    userId: user?.id,
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

        {/* Thinking cycle label */}
        {state === STATES.THINKING && thinkingLabel && (
          <div className="text-center mt-2">
            <p className="text-[18px] font-light tracking-widest text-purple-300/80 animate-pulse">
              {thinkingLabel}
            </p>
          </div>
        )}

        {/* Static orb text for other states */}
        {state !== STATES.THINKING && orbText.line1 && (
          <div className="text-center mt-2">
            <p className="text-[20px] font-medium tracking-tight">{orbText.line1}</p>
            {orbText.line2 && (
              <p className="text-sm text-white/50 mt-1">{orbText.line2}</p>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {response && (
            <motion.p
              key="response"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="max-w-sm text-center text-white/75 text-sm leading-relaxed px-6"
            >
              {response}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Mic button */}
      <MicButton state={state} onClick={handleMicClick} isActive={isActive} />

      {/* State cards */}
      <StatePanel state={state} smoothed={smoothed} rms={rmsRef.current ?? 0} />

      {/* Conversation history — slide-up from bottom-left */}
      <ConversationHistory userId={user?.id} />

      {/* User pill — top right */}
      {user && (
        <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
          <span className="text-[11px] font-mono text-white/40 tracking-wider">
            {user.displayName}
          </span>
          <button
            onClick={onSignOut}
            className="text-[10px] font-mono text-white/20 hover:text-white/50 transition-colors tracking-widest uppercase"
          >
            sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      {({ user, onSignOut }) => (
        <VoiceApp user={user} onSignOut={onSignOut} />
      )}
    </AuthGate>
  );
}
