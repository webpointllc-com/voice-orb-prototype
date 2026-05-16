# GROK / CLAUDE MEMORY
**Shared Persistent Memory — Voice Orb Prototype**
**Re-read on every session entry. Update after every major push.**

## Snapshot (2026-05-16 — feature complete, deploying)
Voice-first biometric AI interface. Two Render free-tier services live. Full voice loop + IndexedDB auth + local storage wired.

## Architecture (locked)
- **Main**: https://voice-orb-prototype.onrender.com (Node.js/Express + React 19 + Vite)
  - /api/transcribe → tries whisper-service (15s timeout) → falls back to Groq Whisper
  - /api/chat → Gemma2 9B via Groq (SSE stream)
  - /api/biometric → stores voice snapshots server-side
  - /api/status → health check
- **Whisper**: https://voice-orb-whisper.onrender.com (Python FastAPI + faster-whisper base.en)
- **Visual rule**: Ribbon wings ALL states. drawThinkingMini() for THINKING card ONLY.
- **Audio**: MediaRecorder + silence detection (RMS < 0.018 for 1200ms) + biometric snapshots
- **Auth**: IndexedDB + localStorage session. No backend auth. PBKDF2 password hashing.

## WAVE REFERENCE SPEC — Workplace Technologies HTML prototype
**Canonical wave movement pattern. Never deviate.**

### Ribbon Wings (drawRibbons)
- **Envelope**: `Math.sin(t * Math.PI)` — rises from 0, peaks at center, falls to 0
- **Bin mapping**: `Math.min(63, Math.floor(t * 60))` — maps position to frequency bin
- **Amplitude curve**: `(0.4 + mag * 1.4)` — always has a minimum floor, scales with audio
- **Attack/decay smoothing**: attack `0.45`, decay `0.12` (fast rise, slow fall)
- **Return path belly**: `CY + flatH * env` (5px for ptsA, 7px for ptsB) — filled shape
- **Wave A**: `sin(t*π*2 + phase*1.2)*22*env*(0.40+mag*1.40) + sin(t*π*4.3 + phase*0.7+0.9)*9*env*(0.20+mag*0.80)`
- **Wave B**: `sin(t*π*2.4 + phase*0.9+1.2)*24*env*(0.40+mag*1.20) + sin(t*π*3.8 + phase*1.4+2.1)*8*env*(0.18+mag*0.70)`
- **Composite mode**: `ctx.globalCompositeOperation = 'lighter'`
- **Diamond markers**: peak detection on waveA, 12 max, size 2–7px

### Dot Ring (drawOrbDots) — orb canvas overlay
- **Count**: `Math.min(96, Math.max(48, Math.floor(W/4)))`
- **Base radius**: `Math.min(W,H) * 0.43`
- **Per-dot radius**: `baseR + mag*22 + sin(phase*1.4 + i*0.07)*0.5`
- **Opacity**: `0.35 + mag * 0.55` — highly responsive to audio
- **Blend mode**: `mixBlendMode: 'screen'` on canvas

## Component Status — ALL COMPLETE
| File | Status | Notes |
|------|--------|-------|
| App.jsx | ✅ | AuthGate wrapped, INTERRUPTED, StateBadge, THINKING labels, AnimatePresence response |
| AuthGate.jsx | ✅ | Create/Login UI, PBKDF2 hash, localStorage session |
| db.js | ✅ | IndexedDB: users, conversations, biometrics, recordings |
| useVoice.js | ✅ | MediaRecorder + silence + biometric + recording save to IDB |
| useAudio.js | ✅ | Returns stream from startMic() |
| WaveCanvas.jsx | ✅ | rmsRef (not stale), STATE_PHASE_SPEED |
| OrbRing.jsx | ✅ | SVG ring + drawOrbDots canvas overlay, rmsRef |
| MicButton.jsx | ✅ | Mic/stop icons, disabled during THINKING/RESPONDING |
| StateCard.jsx | ✅ | drawRibbons all states, drawThinkingMini for THINKING |
| StatePanel.jsx | ✅ | STATE_CARD_ORDER, all 4 props to StateCard |
| StateBadge.jsx | ✅ | Wired top-left in App.jsx |
| ribbonMath.js | ✅ | drawRibbons + drawOrbDots + drawThinkingMini |
| stateMachine.js | ✅ | 7 states, canTransition, all visual tokens |
| server.js | ✅ | Whisper routing + Groq fallback + biometric storage |
| whisper-service/main.py | ✅ | FastAPI + faster-whisper, boots correctly |

## IndexedDB Schema
- **users**: id, username, displayName, passwordHash (PBKDF2), createdAt, voiceProfile, totalSessions
- **conversations**: id, userId, transcript, response, durationMs, timestamp
- **biometrics**: id, userId, sessionId, rmsHistory, durationMs, timestamp
- **recordings**: id, userId, sessionId, audioBlob, transcript, timestamp
- **Session**: localStorage `vob_session` → { id, username, displayName }

## Remaining / Nice-to-Have
1. End-to-end smoke test on live URL — verify full loop works post-deploy
2. Conversation history UI — show past sessions to logged-in user
3. Voice profile visualization — display biometric patterns over time
4. INTERRUPTED threshold tuning — currently 0.032 rms, may need adjustment

## Key Decisions (do not revisit)
- Two free-tier Render services
- Ribbon wings only (no bars)
- MediaRecorder + backend Whisper
- Biometric snapshots dual-saved (backend + IndexedDB)
- Gemma2 9B on Groq / Browser SpeechSynthesis TTS
- rmsRef as ref not value (no stale closures)
- PBKDF2 via SubtleCrypto — no backend auth needed for demo

## Quick Reference
- Main: https://voice-orb-prototype.onrender.com
- Whisper: https://voice-orb-whisper.onrender.com
- Status: /api/status
- Log: claude-ops/GROK_LOG.md
- Memory: claude-ops/GROK_CLAUDE_MEMORY.md

## NOTE ON GROK PUSH ACCESS
Grok (billjr@webpointllc.com) DID push 13 real commits early in the project.
His push access appears to have broken mid-session (token/connection issue).
He is NOT unable to push by design — something needs to be reconnected.
Once restored, he can resume direct commits.
