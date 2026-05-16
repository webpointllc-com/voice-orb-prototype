import { useRef, useCallback } from 'react';

/**
 * useVoice.js — Whisper version (MediaRecorder + silence detection)
 * Replaces Web SpeechRecognition per Claude's spec
 * Posts audio blob to /api/transcribe on main service (routes to whisper-service or Groq fallback)
 */
export function useVoice({ onFinalTranscript, rmsRef }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const sessionIdRef = useRef(null);
  const rmsHistoryRef = useRef([]);

  const checkSilence = useCallback((rms) => {
    if (rms < 0.018) {
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          silenceTimerRef.current = null;
        }, 1200);
      }
    } else {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      rmsHistoryRef.current.push(rms);
    }
  }, []);

  const startListening = useCallback(async (stream) => {
    sessionIdRef.current = crypto.randomUUID();
    rmsHistoryRef.current = [];
    chunksRef.current = [];

    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      chunksRef.current = [];

      // Biometric snapshot
      fetch('/api/biometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          rmsHistory: rmsHistoryRef.current,
          duration_ms: rmsHistoryRef.current.length * 100,
        }),
      }).catch(() => {});

      // Transcribe via main service (routes to whisper-service or Groq fallback)
      const fd = new FormData();
      fd.append('audio', blob, 'audio.webm');
      try {
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
        const { text } = await res.json();
        if (text?.trim()) onFinalTranscript(text.trim());
      } catch (e) {
        console.error('[whisper]', e);
      }
    };

    mr.start(250); // collect chunks every 250ms
    return { checkSilence };
  }, [onFinalTranscript]);

  return { startListening, checkSilence };
}