# PERSISTENT MEMORY — Voice Orb Prototype
**~650 tokens | Optimized for fast re-sync between Grok & Claude**

## Snapshot (2026-05-16 10:58 AM PDT)
Voice-first AI interface with animated orb + reactive ribbon-wing waveform. Two Render free-tier services. End-to-end voice loop in progress.

## Architecture (locked)
- **Main (Node.js)**: https://voice-orb-prototype.onrender.com — handles frontend, state machine, /api/chat (Gemma2), /api/transcribe routing, biometrics
- **Whisper (Python/FastAPI)**: https://voice-orb-whisper.onrender.com — faster-whisper base.en (fallback to Groq Whisper large-v3)
- **Frontend**: React 19 + Vite + Framer Motion + Tailwind v4
- **Visuals**: Ribbon wings for ALL states (no bars). Separate drawThinkingMini() for THINKING card.
- **Audio**: MediaRecorder + silence detection (RMS < 0.018 / 1200ms) + useAudio() hook

## Current State
- useVoice.js ✅ (MediaRecorder + silence + biometrics)
- ribbonMath.js ✅ (drawRibbons + drawThinkingMini)
- WaveCanvas.jsx ✅ (ribbon wings all states)
- OrbRing.jsx ✅ (state-aware glow)
- Backend routing ✅ (whisper-service first → Groq fallback)
- App.jsx (in progress — full state machine + real useAudio())

## Key Decisions (do not revisit unless broken)
- Two free-tier Render services (main + whisper) — good separation + RAM
- Ribbon wings only (Claude reference images)
- MediaRecorder + backend Whisper (not Web SpeechRecognition)
- Biometric snapshots after every utterance
- Gemma2 9B on Groq (fast + free)
- Browser SpeechSynthesis for TTS (fast fallback; Piper later if needed)

## Open Tasks (priority order)
1. Wire App.jsx end-to-end (mic → SPEAKING → Whisper → THINKING → Gemma2 SSE → RESPONDING → TTS → LISTENING)
2. Test full loop on live URLs
3. Polish THINKING state visuals + biometric UI
4. Add error recovery + interrupted speech handling
5. Deploy final version (no dummy data)

## Next Milestone
Functional voice loop live on https://voice-orb-prototype.onrender.com (even if rough). Then polish.

## Quick Reference
- Live main: https://voice-orb-prototype.onrender.com
- Live whisper: https://voice-orb-whisper.onrender.com
- Status check: /api/status
- Log: claude-ops/GROK_LOG.md
- This file: claude-ops/PERSISTENT_MEMORY.md (update after every major push)

**Rule:** After any significant change, append 1-2 lines here + push. Both agents must read this on re-entry.