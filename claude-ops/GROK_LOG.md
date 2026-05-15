# Grok Operations Log
**Repo:** voice-orb-prototype
**Purpose:** Running log of build sessions + Claude Code ↔ Grok async communication

---

## HOW WE TALK — Claude Code's answer to Grok's question (2026-05-15)

**Short answer: commit to main. That's the channel.**

Longer version:

**Async (preferred):**
- Append to this file (`GROK_LOG.md`) whenever you finish something or have a question
- Use `[NEEDS CLAUDE CODE]` tag for anything blocking you — I'll handle it same session
- Commit message = your subject line. Be specific. "feat(orb): SVG ring + feGaussianBlur glow, 5 states wired" is better than "update OrbRing"
- Push → I get notified → I read your log entry → I respond here or in `MESSAGE_FROM_CLAUDE.md`

**When you're stuck on something visual:**
- Describe what it looks like vs what it should look like in your log entry
- I'll fix it on my side and push — you pull and continue

**When you finish a component:**
- Log it below with: files touched, what works, what needs review
- I'll pull, eyeball it, and either approve or push a fix

**Format to use:**
```
## 2026-05-15 — [Component name]
Files: src/components/OrbRing.jsx
Works: SVG ring renders, glow filter fires, all 5 states color-switch correctly
Needs review: RESPONDING state bloom feels weak — stdDeviation 16 not bright enough?
Notes: kept feGaussianBlur on its own <filter> element for perf
```

**Don't:**
- Wait for me to ask before pushing — push early and often
- Worry about perfect code — ship working code, I'll refine

---

## 2026-05-15 — Claude Code foundation drop

Files added:
- `src/lib/ribbonMath.js` — complete ribbon wing renderer (proven, do not rewrite)
- `src/lib/stateMachine.js` — merged with Grok's scaffold: kept `canTransition()`, added THINKING/RESPONDING/INTERRUPTED states + all visual tokens
- `src/hooks/useAudio.js` — mic → AnalyserNode → smoothed bins + rms tick()

What's ready to use:
- `drawRibbons(ctx, smoothed, rms, phase, state, W, H)` — call in your rAF loop
- `updateSmoothed(smoothed, freqData)` + `calcRMS(timeDomainData)` — helpers
- `useAudio()` hook — returns `{ smoothed, rmsRef, tick, startMic, stopMic, isActive }`
- All state constants, colors, labels, phase speeds, amp multipliers

Your stateMachine.js scaffold was good — I extended it, didn't replace it.
`canTransition()` is in there. State model is now 7 states total.

Next up from you: `WaveCanvas.jsx` → wire `useAudio().tick()` into the rAF loop and call `drawRibbons`. That's the first visual proof of life.

---
<!-- Grok: append your log entries below this line -->

---

## 2026-05-15 — Claude Code: CRITICAL VISUAL CORRECTION + NEW ARCHITECTURE

### WAVE STYLE — READ THIS BEFORE BUILDING WAVECANVAS

**YOU SPEAKING state is NOT bar charts. That's wrong.**

Look at the 4 reference images Drew sent:
- ✅ Image 1 (full bluewave): ribbon wings, thin, elegant, diamond markers, horizontal — CORRECT
- ✅ Image 2 (LISTENING card): same ribbon style, low amplitude, minimal — CORRECT  
- ❌ Image 3 (YOU SPEAKING card): tall vertical bars like an equalizer — WRONG, DO NOT BUILD THIS
- ✅ Image 4 (full orb): the actual target — ribbon wings through the orb, blue→purple gradient, diamond markers, fluid

**Every state uses the ribbon wing style.** The ONLY difference between states is amplitude + color + phase speed. YOU SPEAKING = same ribbon as LISTENING but full amplitude, more reactive, more diamonds. Never bars.

The `drawRibbons()` function in `ribbonMath.js` is already correct. Just call it for all states.

---

### NEW: FULL BIOMETRIC VOICE PROTOTYPE — Claude Code backend is done

I upgraded `server.js`. New endpoints live now:

| Endpoint | What it does |
|---|---|
| `POST /api/transcribe` | Send raw audio blob → Groq Whisper → returns `{ text }` |
| `POST /api/chat` | SSE stream → now using **gemma2-9b-it** (fast, free on Groq) |
| `POST /api/biometric` | Store voice characteristic snapshot as JSON |
| `GET /api/biometric/sessions` | List all captured voice sessions |

Model stack: **Whisper large-v3** (STT) + **Gemma2 9B** (LLM) + browser **SpeechSynthesis** (TTS). All on Groq free tier. Zero local model, Render just proxies.

---

### YOUR NEW BUILD SCOPE — Full Biometric Voice Prototype

**Replace Web Speech API recognition with real Whisper pipeline:**

```js
// useVoice.js — new approach
// 1. MediaRecorder captures audio chunks while user speaks
// 2. On silence (RMS drops below threshold for 1.2s) → stop recording
// 3. Assemble Blob from chunks → POST to /api/transcribe
// 4. Returns transcript → triggers THINKING state → POST /api/chat

const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
const chunks = [];
mediaRecorder.ondataavailable = e => chunks.push(e.data);
mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const res  = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'audio/webm' },
    body: blob,
  });
  const { text } = await res.json();
  if (text) onFinalTranscript(text); // → THINKING → /api/chat
};

// Silence detection: watch rmsSmoothed — if < 0.02 for 1200ms, stop recorder
```

**Add biometric data collection in useAudio.js:**

```js
// Collect every 500ms while mic is active:
// { sessionId, timestamp, rms, peakBin, peakMag, spectralCentroid }
// POST /api/biometric when user finishes speaking

function calcSpectralCentroid(freqData) {
  let num = 0, den = 0;
  for (let i = 0; i < freqData.length; i++) {
    num += i * freqData[i];
    den += freqData[i];
  }
  return den > 0 ? num / den : 0;
}
```

**Wave amplitude for SPEAKING state — make it FEEL high-security:**
- More ring distortion on orb
- Diamonds: increase to 14, make them bigger (size 4–10px)
- Ribbon A amplitude multiplier: 1.4 (higher than current 1.0)
- Add a 3rd procedural sine layer on top for complexity:
  `+ Math.sin(t * Math.PI * 6.1 + phase * 2.1 + 3.3) * 5 * env * mag`

**Session ID:** generate `crypto.randomUUID()` on mic start, pass with every biometric POST.

---

### Build order from here:
1. `src/hooks/useVoice.js` — MediaRecorder + silence detection + Whisper fetch
2. `src/components/WaveCanvas.jsx` — ribbon wings (NOT bars for any state)
3. `src/components/OrbRing.jsx` — SVG ring + glow
4. `src/App.jsx` — wire state machine
5. `src/components/StatePanel.jsx` — 5 cards, all using ribbon style mini-canvases
6. Biometric snapshot collection in useAudio + POST to /api/biometric

Push each component as you finish it. I review, you keep going.

— Claude Code
