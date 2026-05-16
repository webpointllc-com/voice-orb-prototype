import { useRef, useCallback } from 'react';
import { saveBiometric, saveRecording, updateVoiceProfile } from '../lib/db';

/**
 * useVoice.js — MediaRecorder + Whisper pipeline
 * Replaces Web SpeechRecognition with real Whisper via /api/transcribe
 * Merged: Grok's biometric POST + Claude's mimeType fallback, isRecordingRef, stopListening
 * IndexedDB: saves biometric + recording per session when userId provided
 */
export function useVoice({ onFinalTranscript, onStateChange, rmsRef, userId }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const silenceTimerRef  = useRef(null);
  const sessionIdRef     = useRef(null);
  const rmsHistoryRef    = useRef([]);
  const isRecordingRef   = useRef(false);

  const checkSilence = useCallback((rms) => {
    if (!isRecordingRef.current) return;
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
      rmsHistoryRef.current.push(parseFloat(rms.toFixed(4)));
    }
  }, []);

  const startListening = useCallback(async (stream) => {
    if (!stream) return;
    sessionIdRef.current  = crypto.randomUUID();
    rmsHistoryRef.current = [];
    chunksRef.current     = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const mr = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mr;
    isRecordingRef.current   = true;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = async () => {
      isRecordingRef.current = false;
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;

      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];

      if (blob.size < 1000) return; // too short, skip

      // Biometric snapshot — backend + IndexedDB
      const bioPayload = {
        sessionId:   sessionIdRef.current,
        rmsHistory:  rmsHistoryRef.current,
        duration_ms: rmsHistoryRef.current.length * 100,
      };
      fetch('/api/biometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bioPayload),
      }).catch(() => {});
      if (userId) {
        saveBiometric({ userId, sessionId: bioPayload.sessionId, rmsHistory: bioPayload.rmsHistory, durationMs: bioPayload.duration_ms }).catch(() => {});
        updateVoiceProfile(userId, rmsHistoryRef.current.slice(-20)).catch(() => {});
      }

      // Transcribe via main service (routes to whisper-service or Groq fallback)
      try {
        const fd = new FormData();
        fd.append('audio', blob, 'audio.webm');
        const res  = await fetch('/api/transcribe', { method: 'POST', body: fd });
        const data = await res.json();
        const transcript = data.text?.trim();
        // Save recording blob + transcript to IndexedDB
        if (userId && transcript) {
          saveRecording({ userId, sessionId: sessionIdRef.current, audioBlob: blob, transcript }).catch(() => {});
        }
        if (transcript) {
          onFinalTranscript(transcript);
        }
      } catch (err) {
        console.error('[useVoice] transcribe error:', err);
        onStateChange?.('ERROR');
      }
    };

    mr.start(250);
    return { checkSilence };
  }, [onFinalTranscript, onStateChange]);

  const stopListening = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    isRecordingRef.current  = false;
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { startListening, stopListening, checkSilence };
}
