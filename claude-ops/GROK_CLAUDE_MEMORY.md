# GROK / CLAUDE MEMORY
**Shared Persistent Memory — Voice Orb Prototype**
**~620 tokens | Optimized for fast re-sync between Grok & Claude Code**

## Snapshot (2026-05-16 10:59 AM PDT)
Voice-first AI interface with animated orb + reactive ribbon-wing waveform. Two Render free-tier services. End-to-end voice loop in active development.

## Architecture (locked — do not change without agreement)
- **Main Service**: https://voice-orb-prototype.onrender.com (Node.js)
  - Frontend (React 19 + Vite + Framer Motion)
  - State machine + full voice loop
  - /api/chat (Gemma2 9B via Groq)
  - /api/transcribe routing (whisper-service first → Groq Whisper fallback)
  - /api/biometric
- **Whisper Service**: https://voice-orb-whisper.onrender.com (Python/FastAPI + faster-whisper base.en)
- **Visual Rule**: Ribbon wings for ALL states (no equalizer bars). Separate `drawThinkingMini()` for THINKING card only.
- **Audio Pipeline**: MediaRecorder + silence detection (RMS < 0.018 for 1200ms) + biometric snapshots

## Current State
- useVoice.js ✅ (MediaRecorder + silence + biometrics + POST to /api/transcribe)
- ribbonMath.js ✅ (drawRibbons + drawThinkingMini)
- WaveCanvas.jsx ✅ (ribbon wings for every state)
- OrbRing.jsx ✅ (state-aware glow + distortion)
- Backend routing ✅ (whisper-service first → Groq fallback)
- App.jsx (in progress — full state machine + real useAudio() wiring)

## Key Decisions (agreed — do not revisit)
- Two free-tier Render services (good RAM separation)
- Ribbon wings only (Claude reference images)
- MediaRecorder + backend Whisper (not Web SpeechRecognition)
- Biometric snapshots after every utterance
- Gemma2 9B on Groq (fast + free)
- Browser SpeechSynthesis for TTS (fast fallback)

## Open Tasks (priority)
1. Complete App.jsx end-to-end voice loop (mic → SPEAKING → Whisper → THINKING → Gemma2 SSE → RESPONDING → TTS → LISTENING)
2. Test full loop on live URLs
3. Polish THINKING state + biometric UI
4. Error recovery + interrupted speech handling
5. Final deploy (no dummy data anywhere)

## Next Milestone
Functional mic → response → TTS loop live on https://voice-orb-prototype.onrender.com (even if rough). Then polish.

## Quick Reference
- Main live: https://voice-orb-prototype.onrender.com
- Whisper live: https://voice-orb-whisper.onrender.com
- Status: /api/status
- Log: claude-ops/GROK_LOG.md
- This file: claude-ops/GROK_CLAUDE_MEMORY.md (read + update after every major push)

**Rule for both agents:** After any significant change, append 1-2 lines here + push. Re-read this file on every re-entry.