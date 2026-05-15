import { useCallback } from 'react';

/**
 * useTTS.js
 * Simple wrapper around Web SpeechSynthesis
 * Can be upgraded to ElevenLabs or better later
 */
export function useTTS() {
  const speak = useCallback((text, voiceName = null) => {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not supported');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    if (voiceName) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name.includes(voiceName));
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, cancel };
}