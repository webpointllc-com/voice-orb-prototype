import { useRef, useCallback, useEffect } from 'react';
import { saveBiometric, saveRecording, updateVoiceProfile } from '../lib/db';
import { postBiometric, postTranscribe } from '../lib/api';

function createSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SR ? new SR() : null;
}

/**
 * Voice input: browser Web Speech (default, no server STT load) or
 * MediaRecorder → /api/transcribe (Groq) when VITE_STT=groq or no Web Speech.
 */
export function useVoice({ onFinalTranscript, onStateChange, rmsRef, userId }) {
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const chunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const sessionIdRef = useRef(null);
  const rmsHistoryRef = useRef([]);
  const isRecordingRef = useRef(false);
  const useBrowserSttRef = useRef(true);
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  const postBiometric = useCallback(() => {
    const bioPayload = {
      sessionId: sessionIdRef.current,
      rmsHistory: rmsHistoryRef.current,
      duration_ms: rmsHistoryRef.current.length * 100,
    };
    postBiometric(bioPayload).catch(() => {});
    const uid = userIdRef.current;
    if (uid) {
      saveBiometric({
        userId: uid,
        sessionId: bioPayload.sessionId,
        rmsHistory: bioPayload.rmsHistory,
        durationMs: bioPayload.duration_ms,
      }).catch(() => {});
      updateVoiceProfile(uid, rmsHistoryRef.current.slice(-20)).catch(() => {});
    }
  }, []);

  const checkSilence = useCallback((rms) => {
    if (!isRecordingRef.current) return;
    if (rms < 0.018) {
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch {}
          } else if (mediaRecorderRef.current?.state === 'recording') {
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

  const startBrowserListening = useCallback(() => {
    const rec = createSpeechRecognition();
    if (!rec) return false;

    const finals = [];
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finals.push(e.results[i][0].transcript);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      console.warn('[useVoice] speech error:', e.error);
      isRecordingRef.current = false;
      onStateChange?.('ERROR');
    };

    rec.onend = () => {
      isRecordingRef.current = false;
      recognitionRef.current = null;
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      postBiometric();
      const transcript = finals.join(' ').trim();
      if (transcript) onFinalTranscript(transcript);
    };

    recognitionRef.current = rec;
    isRecordingRef.current = true;
    rec.start();
    return true;
  }, [onFinalTranscript, onStateChange, postBiometric]);

  const startRecorderListening = useCallback(async (stream) => {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const mr = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mr;
    isRecordingRef.current = true;
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = async () => {
      isRecordingRef.current = false;
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;

      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (blob.size < 1000) return;

      postBiometric();

      try {
        const fd = new FormData();
        fd.append('audio', blob, 'audio.webm');
        const res = await postTranscribe(fd);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `transcribe ${res.status}`);
        const transcript = data.text?.trim();
        const uid = userIdRef.current;
        if (uid && transcript) {
          saveRecording({
            userId: uid,
            sessionId: sessionIdRef.current,
            audioBlob: blob,
            transcript,
          }).catch(() => {});
        }
        if (transcript) onFinalTranscript(transcript);
      } catch (err) {
        console.error('[useVoice] transcribe error:', err);
        onStateChange?.('ERROR');
      }
    };

    mr.start(250);
  }, [onFinalTranscript, onStateChange, postBiometric]);

  const startListening = useCallback(async (stream) => {
    sessionIdRef.current = crypto.randomUUID();
    rmsHistoryRef.current = [];

    const forceGroq = import.meta.env.VITE_STT === 'groq';
    useBrowserSttRef.current = !forceGroq && Boolean(createSpeechRecognition());

    if (useBrowserSttRef.current && startBrowserListening()) return;

    if (!stream) {
      onStateChange?.('ERROR');
      return;
    }
    useBrowserSttRef.current = false;
    await startRecorderListening(stream);
  }, [startBrowserListening, startRecorderListening, onStateChange]);

  const stopListening = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { startListening, stopListening, checkSilence };
}
