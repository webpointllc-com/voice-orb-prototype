# GROK / CLAUDE MEMORY
**Shared Persistent Memory — Voice Orb Prototype**
**~900 tokens | Re-read on every session entry. Update after every major push.**

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

## WAVE REFERENCE SPEC — Workplace Technologies HTML prototype
**This is the canonical wave movement pattern. Never deviate.**

### Ribbon Wings (drawRibbons)
- **Envelope**: `Math.sin(t * Math.PI)` — rises from 0, peaks at center, falls to 0
- **Bin mapping**: `Math.min(63, Math.floor(t * 60))` — maps position to frequency bin
- **Amplitude curve**: `(0.4 + mag * 1.4)` — always has a minimum floor, scales with audio
- **Attack/decay smoothing**: attack `0.45`, decay `0.12` (fast rise, slow fall)
- **Return path belly**: `CY + flatH * env` (5px for ptsA, 7px for ptsB) — filled shape
- **Wave A**: `sin(t*π*2 + phase*1.2)*22*env*(0.40+mag*1.40) + sin(t*π*4.3 + phase*0.7+0.9)*9*env*(0.20+mag*0.80)`
- **Wave B**: `sin(t*π*2.4 + phase*0.9+1.2)*24*env*(0.40+mag*1.20) + sin(t*π*3.8 + phase*1.4+2.1)*8*env*(0.18+mag*0.70)`
- **Composite mode**: `ctx.globalCompositeOperation = 'lighter'` — additive blending
- **Diamond markers**: peak detection on waveA, 12 max, size 2–7px based on distance from CY
- **Baseline**: horizontal stroke at CY, dashed for THINKING state

### Dot Ring (drawOrbDots) — orb canvas overlay
- **Count**: `Math.min(96, Math.max(48, Math.floor(W/4)))`
- **Base radius**: `Math.min(W,H) * 0.43` (~73% of orb radius)
- **Per-dot radius**: `baseR + mag*22 + sin(phase*1.4 + i*0.07)*0.5`
- **Opacity**: `0.35 + mag * 0.55` — highly responsive to audio
- **Size**: `1.4 + mag * 1.4` px
- **Bin**: `Math.min(63, Math.floor((i/count)*50)+2)` — maps dot angle to frequency
- **Blend mode**: `mixBlendMode: 'screen'` on canvas — additive glow with SVG ring

### Key visual feel
- Highly sensitive / bio-marker style — dots and ribbons react immediately to voice
- Smooth organic movement — no bars, no choppy updates
- The waveform is alive: breathing motion even in silence from `+0.04` mag floor and phase animation

## Component Status
| File | Status | Notes |
|------|--------|-------|
| App.jsx | ✅ DONE | Real useAudio + useVoice, full SSE loop, TTS auto-restart, passes rmsRef+smoothed to OrbRing |
| useVoice.js | ✅ DONE | MediaRecorder + silence + biometric POST + Whisper fetch |
| useAudio.js | ✅ DONE | Returns stream from startMic() |
| WaveCanvas.jsx | ✅ DONE | Uses rmsRef (not stale value), STATE_PHASE_SPEED |
| OrbRing.jsx | ✅ DONE | SVG ring + drawOrbDots canvas overlay, state-aware colors, rmsRef |
| MicButton.jsx | ✅ DONE | Mic/stop icons, disabled during THINKING/RESPONDING |
| StateCard.jsx | ✅ DONE | drawRibbons all states, drawThinkingMini for THINKING |
| StatePanel.jsx | ✅ DONE | STATE_CARD_ORDER, passes state prop |
| ribbonMath.js | ✅ DONE | drawRibbons + drawOrbDots + drawThinkingMini, amplitude tuned to reference |
| stateMachine.js | ✅ DONE | 7 states, canTransition, all visual tokens |
| useAudioRecorder.js | ✅ DONE | Fixed TypeScript syntax |
| server.js | ✅ DONE | Whisper routing + Groq fallback + biometric storage |
| whisper-service/main.py | ✅ DONE | Fixed indentation, boots correctly |

## Open / Needs Work
1. **End-to-end test on live URL** — hit https://voice-orb-prototype.onrender.com, tap mic, speak, verify full loop
2. **INTERRUPTED state** — cancel TTS mid-response → go back to LISTENING (App.jsx: listen for new speech during RESPONDING, call window.speechSynthesis.cancel() then go(STATES.INTERRUPTED → LISTENING))
3. **Error recovery** — tap mic again from ERROR state (already wired in handleMicClick, verify works)
4. **StateBadge.jsx** — check if it integrates cleanly or needs wiring

## Key Decisions (do not revisit)
- Two free-tier Render services (RAM separation)
- Ribbon wings only (no bars ever)
- MediaRecorder + backend Whisper (not Web SpeechRecognition)
- Biometric snapshots after every utterance
- Gemma2 9B on Groq
- Browser SpeechSynthesis TTS
- rmsRef passed as ref not value (no stale closures)
- drawOrbDots on canvas overlay (mixBlendMode: screen) — not SVG dots

## Quick Reference
- Main: https://voice-orb-prototype.onrender.com
- Whisper: https://voice-orb-whisper.onrender.com
- Status: /api/status
- Log: claude-ops/GROK_LOG.md
- Memory: claude-ops/GROK_CLAUDE_MEMORY.md

**Rule: update this file + push after every significant change.**
