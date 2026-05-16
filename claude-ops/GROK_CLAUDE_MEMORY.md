# GROK / CLAUDE MEMORY
**Shared Persistent Memory — Voice Orb Prototype**
**Re-read every session. Both agents update after major work.**

---

## 🟢 CHECKPOINT — WIRING AUDIT CLEAN (2026-05-16)
All 17 source files audited. 3 bugs fixed. App is correctly wired end-to-end.
See GROK_LOG.md → "CHECKPOINT — WIRING AUDIT COMPLETE" for full details.

---

## Quick Restore Prompts

**To restore Grok:**
```
You are Grok working on voice-orb-prototype with Claude Code.
Read claude-ops/GROK_LOG.md — the 1000-TOKEN SESSION CONTEXT block and GROK PERSISTENT STATE block.
GitHub: billjr@webpointllc.com via MCP connector. Last working SHA: 0e1266b34a517af9a18be895002d250cf2b32959
Current task: MicButton pulse ring + QA on live URL. Push first, report second.
```

**To restore Claude Code:**
```
Continue voice-orb-prototype. Read claude-ops/GROK_CLAUDE_MEMORY.md then GROK_LOG.md
SESSION CONTEXT block. All components done. Wiring audited clean. Next: respond to
whatever Grok pushed and tackle remaining nice-to-haves (voice profile page, etc).
```

---

## Live URLs
- App: https://voice-orb-prototype.onrender.com
- Whisper: https://voice-orb-whisper.onrender.com
- Status: GET /api/status → `{"ok":true,"stt":"...","llm":"groq:gemma2-9b-it"}`

---

## Architecture (locked)
- Frontend: React 19 + Vite 6 + Tailwind v4 + Framer Motion
- STT: /api/transcribe → whisper-service (faster-whisper base.en) → Groq Whisper fallback
- LLM: Gemma2-9b-it via Groq, SSE stream (/api/chat)
- TTS: browser SpeechSynthesis (rate 1.05)
- Auth: IndexedDB PBKDF2 + localStorage session — no backend auth
- IDB Storage: ~5GB — users, conversations, biometrics, recordings

---

## 7 States (stateMachine.js — USE THESE EXACT STRINGS)
```
IDLE → LISTENING → SPEAKING → THINKING → RESPONDING → INTERRUPTED → LISTENING
                                        ↘ ERROR ↗ (any state on failure)
```
State transitions enforced by `canTransition(from, to)`. Never bypass it.

---

## Visual Rules (LOCKED — never change)
- Ribbon wings: `drawRibbons(ctx, smoothed, rms, phase, state, W, H)` — ALL states
- THINKING StateCard only: `drawThinkingMini(ctx, phase, W, H)` — orbiting dots
- Orb dot ring: `drawOrbDots()` on canvas overlay, `mixBlendMode: 'screen'`
- Wave envelope: `Math.sin(t * Math.PI)` — do not touch
- Amplitude: `(0.40 + mag * 1.40)` for wave A, `(0.40 + mag * 1.20)` for wave B
- Attack smoothing: 0.45 / Decay: 0.12
- **No bars. Ever. No separate text inside OrbRing (App.jsx handles STATE_ORB_TEXT)**

---

## CRITICAL WIRING RULE — WaveCanvas tick()
```
WaveCanvas rAF loop MUST call tick() every frame.
tick() = fullTick from App.jsx which drives:
  - useAudio frequency analysis (updates smoothed + rmsRef)
  - LISTENING → SPEAKING transition (rms > 0.025)
  - Silence detection → THINKING (rms < 0.018 for 1200ms)
  - INTERRUPTED detection (rms > 0.032 during RESPONDING)
Without tick(): the app shows animations but never transcribes or responds.
```

---

## IndexedDB Schema (db.js)
```
users:         id, username, displayName, passwordHash, passwordSalt (PBKDF2), createdAt, voiceProfile
conversations: id(auto), userId, transcript, response, durationMs, timestamp
biometrics:    id(auto), userId, sessionId, rmsHistory, durationMs, timestamp
recordings:    id(auto), userId, sessionId, audioBlob, transcript, timestamp
localStorage:  vob_session → {id, username, displayName}
```

---

## All Components — Status Post-Audit

| File | Owner | Status |
|------|-------|--------|
| App.jsx | Claude | ✅ fullTick wired, AuthGate wrapped, ConversationHistory, AnimatePresence |
| AuthGate.jsx | Claude | ✅ Create/Login, PBKDF2, localStorage session |
| db.js | Claude | ✅ Full IDB schema + PBKDF2 helpers |
| ConversationHistory.jsx | Claude | ✅ Slide-up panel, clock icon, IDB read |
| WaveCanvas.jsx | Claude | ✅ drawRibbons + tick() per frame (restored after Grok overwrote) |
| OrbRing.jsx | Both | ✅ Grok's glass design + Claude's canvas dot ring + rmsRef glow |
| useVoice.js | Both | ✅ MediaRecorder + silence + IDB save + userIdRef fix |
| useAudio.js | Claude | ✅ tick(), rmsRef, smoothed, startMic returns stream |
| MicButton.jsx | Grok | ✅ Clean, correct props |
| StateBadge.jsx | Grok | ✅ Wired top-left in App |
| StateCard.jsx | Grok | ✅ drawRibbons + drawThinkingMini |
| StatePanel.jsx | Claude | ✅ STATE_CARD_ORDER, correct props |
| ribbonMath.js | Claude | ✅ drawRibbons + drawOrbDots + drawThinkingMini |
| stateMachine.js | Both | ✅ 7 states, all visual tokens |
| server.js | Claude | ✅ Whisper routing + Groq fallback + biometric |
| whisper-service/main.py | Grok | ✅ FastAPI + faster-whisper |

---

## Remaining Work
1. **MicButton pulse ring** — slow expanding ring when LISTENING (Grok)
2. **Live URL QA** — auth, ribbons, dot ring, INTERRUPTED (Grok)
3. **Voice profile page** — visualize biometric history (nice-to-have)
4. **Conversation history** — component built, needs QA (Claude built it)

---

## Grok's GitHub Setup
- Account: Webpoint | billjr@webpointllc.com
- Push method: GitHub MCP connector (no local git/terminal)
- Last working SHA: 0e1266b34a517af9a18be895002d250cf2b32959
- If push breaks: reconnect GitHub MCP connector in Grok's interface

---

## Key Decisions (do not revisit)
- Two Render free-tier services (RAM separation)
- Ribbon wings only — no bars, no separate WaveCanvas sine waves
- MediaRecorder + backend Whisper (not Web SpeechRecognition)
- Biometric snapshots saved backend AND IndexedDB
- Gemma2 9B on Groq / Browser SpeechSynthesis TTS
- rmsRef as ref not value everywhere (no stale closures)
- PBKDF2 via SubtleCrypto — no backend auth needed for demo
- drawOrbDots on canvas overlay (mixBlendMode screen) — not SVG dots
- State text rendered in App.jsx via STATE_ORB_TEXT — never hardcode in OrbRing

---
**Rule: update this file + push after every significant change.**
