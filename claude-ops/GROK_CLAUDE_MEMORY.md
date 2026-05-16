# GROK / CLAUDE MEMORY
**Shared Persistent Memory — Voice Orb Prototype**
**~700 tokens | Re-read on every session entry. Update after every major push.**

## Snapshot (2026-05-16 — ping-pong sprint)
Voice-first AI interface with animated orb + reactive ribbon-wing waveform. Two Render free-tier services. Full voice loop wired and deployed.

## Architecture (locked)
- **Main**: https://voice-orb-prototype.onrender.com (Node.js/Express + React 19 + Vite)
  - /api/transcribe → tries whisper-service (15s timeout) → falls back to Groq Whisper
  - /api/chat → Gemma2 9B via Groq (SSE stream)
  - /api/biometric → stores voice snapshots
  - /api/status → health check
- **Whisper**: https://voice-orb-whisper.onrender.com (Python FastAPI + faster-whisper base.en)
- **Visual rule**: Ribbon wings ALL states. drawThinkingMini() for THINKING card ONLY.
- **Audio**: MediaRecorder + silence detection (RMS < 0.018 for 1200ms) + biometric snapshots

## Component Status
| File | Status | Notes |
|------|--------|-------|
| App.jsx | ✅ DONE | Real useAudio + useVoice, full SSE loop, TTS auto-restart |
| useVoice.js | ✅ DONE | MediaRecorder + silence + biometric POST + Whisper fetch |
| useAudio.js | ✅ DONE | Returns stream from startMic() |
| WaveCanvas.jsx | ✅ DONE | Uses rmsRef (not stale value), STATE_PHASE_SPEED |
| OrbRing.jsx | ✅ DONE | State-aware colors + glow + RMS ring pulse |
| MicButton.jsx | ✅ DONE | Mic/stop icons, disabled during THINKING/RESPONDING |
| StateCard.jsx | ✅ DONE | drawRibbons all states, drawThinkingMini for THINKING |
| StatePanel.jsx | ✅ DONE | STATE_CARD_ORDER, passes state prop |
| ribbonMath.js | ✅ DONE | drawRibbons + drawThinkingMini |
| stateMachine.js | ✅ DONE | 7 states, canTransition, all visual tokens |
| useAudioRecorder.js | ✅ DONE | Fixed TypeScript syntax |
| server.js | ✅ DONE | Whisper routing + Groq fallback + biometric storage |
| whisper-service/main.py | ✅ DONE | Fixed indentation, boots correctly |

## Open / Grok To Test
1. **End-to-end test on live URL** — hit https://voice-orb-prototype.onrender.com, tap mic, speak, verify full loop
2. **StateBadge.jsx** — check if it integrates cleanly or needs wiring
3. **INTERRUPTED state** — needs handling in App.jsx (cancel TTS mid-response → go back to LISTENING)
4. **Error recovery** — tap mic again from ERROR state

## Key Decisions (do not revisit)
- Two free-tier Render services (RAM separation)
- Ribbon wings only (no bars ever)
- MediaRecorder + backend Whisper (not Web SpeechRecognition)
- Biometric snapshots after every utterance
- Gemma2 9B on Groq
- Browser SpeechSynthesis TTS
- rmsRef passed as ref not value (no stale closures)

## Quick Reference
- Main: https://voice-orb-prototype.onrender.com
- Whisper: https://voice-orb-whisper.onrender.com
- Status: /api/status
- Log: claude-ops/GROK_LOG.md
- Memory: claude-ops/GROK_CLAUDE_MEMORY.md

**Rule: update this file + push after every significant change.**
