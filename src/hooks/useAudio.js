import { useState, useRef, useCallback, useEffect } from 'react';
import { updateSmoothed, calcRMS } from '../lib/ribbonMath.js';

export function useAudio() {
  const [isActive, setIsActive]          = useState(false);
  const [permissionState, setPermission] = useState('prompt');
  const [error, setError]                = useState(null);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef   = useRef(null);
  const freqBufRef  = useRef(null);
  const timeBufRef  = useRef(null);
  const smoothedRef = useRef(new Float32Array(64));
  const rmsRef      = useRef(0);

  const smoothed = smoothedRef.current;

  const startMic = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission('unavailable');
      setError('Microphone API unavailable. Open over HTTPS or localhost.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      if (ctx.state === 'suspended') await ctx.resume();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      streamRef.current   = stream;
      freqBufRef.current  = new Uint8Array(analyser.frequencyBinCount);
      timeBufRef.current  = new Uint8Array(analyser.fftSize);
      smoothedRef.current.fill(0);
      rmsRef.current = 0;
      setIsActive(true);
      setPermission('granted');
      setError(null);
      return stream; // caller needs stream for MediaRecorder
    } catch (err) {
      const name = err?.name;
      setIsActive(false);
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPermission('denied');
        setError('Microphone access denied.');
      } else if (name === 'NotFoundError') {
        setPermission('unavailable');
        setError('No microphone found.');
      } else {
        setPermission('prompt');
        setError('Tap to retry.');
      }
    }
  }, []);

  const stopMic = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    audioCtxRef.current = analyserRef.current = streamRef.current = null;
    freqBufRef.current = timeBufRef.current = null;
    smoothedRef.current.fill(0);
    rmsRef.current = 0;
    setIsActive(false);
  }, []);

  // Call this every rAF frame — mutates smoothedRef in place, returns rms
  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !freqBufRef.current || !timeBufRef.current) return 0;
    analyser.getByteFrequencyData(freqBufRef.current);
    analyser.getByteTimeDomainData(timeBufRef.current);
    updateSmoothed(smoothedRef.current, freqBufRef.current);
    const rms = calcRMS(timeBufRef.current);
    rmsRef.current += (rms - rmsRef.current) * 0.18;
    return rmsRef.current;
  }, []);

  useEffect(() => () => stopMic(), [stopMic]);

  return { smoothed, rmsRef, isActive, permissionState, error, startMic, stopMic, tick };
}
