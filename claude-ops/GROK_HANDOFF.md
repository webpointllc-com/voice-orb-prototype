# GROK HANDOFF — Voice Orb Interface
**Issued by:** Claude Code (Anthropic)
**Date:** 2026-05-15
**Repo:** voice-orb-prototype
**Stack:** React 19 + Vite 6 + Tailwind CSS v4 + Framer Motion v11 + Web Audio API + Web Speech API
**Your job:** Build the entire frontend. Pixel perfect. Max it out.

---

## SCREENSHOT REFERENCE — Read This Before Every Decision

The target is the exact screenshot in this repo root (`reference.png`). Every pixel matters. Here is what's in it:

**Main viewport (top ~75% of screen):**
- Pure black background `#000000`
- Center: large glowing circle ring ~420px, NOT filled — ring only, ~2px stroke, gradient blue→purple (top-left blue `#4F8BFF`, bottom-right purple `#9B7BFF`), outer glow corona via SVG filter
- Inside the orb ring: 3–4 concentric ghost rings, each larger, each more transparent (~8% opacity), evenly spaced ~16px apart — they are the "sonar" pulse rings
- Centered text inside orb: `"I'm listening"` (white, 500 weight, ~22px) and below it `"Speak naturally"` (gray `#888`, 400 weight, ~14px)
- Horizontal waveform running full viewport width, vertically centered at orb center:
  - Thin baseline (1px, low opacity)
  - Small amplitude wave bumps (NOT big bars — subtle, elegant, like EKG flatline with gentle activity)
  - 6–10 **diamond/rhombus markers** at waveform peaks — small rotated squares, filled, same color as waveform
  - Color in LISTENING state: teal `#00D4FF` left side fading to purple `#9B7BFF` right side
  - Wings extend edge-to-edge; inside the orb ring the wave continues through

**Top HUD:**
- Top left: `● Listening` — small green dot `#10B981` + text `"Listening"`, 11px uppercase, DM Mono or monospace, inside a dark rounded pill `rgba(255,255,255,0.06)` with subtle border
- Top center: `"LIVE INTERFACE PREVIEW"` — 11px, letter-spacing wide, color `#555`, DM Mono
- Top right: gear icon ⚙, 20px, `rgba(255,255,255,0.4)`, clicking opens settings panel

**Bottom center (below orb):**
- Microphone button: dark rounded pill ~56px diameter, `rgba(255,255,255,0.08)` bg, subtle border, mic SVG icon white

**State panel (bottom ~25% of screen):**
- Full-width strip, 5 cards side by side with equal spacing
- Each card: `rgba(255,255,255,0.04)` bg, `rgba(255,255,255,0.08)` border 1px, border-radius 16px, padding 16px
- Card label: uppercase 11px DM Mono, color-coded
- Mini waveform canvas (150×50px) in each card — always looping, no mic needed
- Active state card: colored border 1px in state color
- Three dots `···` at bottom of each card (more options hint)

---

## Project Structure — Create This Exactly

```
voice-orb-prototype/
├── server.js                    ← ALREADY DONE. DO NOT TOUCH.
├── package.json                 ← update: add frontend dev deps
├── vite.config.js               ← Vite config (you create)
├── tailwind.config.js           ← Tailwind v4 config (you create)
├── index.html                   ← Vite entry (you create)
├── src/
│   ├── main.jsx                 ← React 19 root mount
│   ├── App.jsx                  ← Top-level layout + state machine
│   ├── styles/
│   │   └── globals.css          ← Tailwind imports + CSS custom props
│   ├── hooks/
│   │   ├── useAudio.js          ← Web Audio API: mic, AnalyserNode, smoothed bins, RMS
│   │   ├── useVoice.js          ← Web Speech API: SpeechRecognition, interim/final results
│   │   └── useTTS.js            ← SpeechSynthesis: speak, cancel, voice select
│   ├── components/
│   │   ├── OrbRing.jsx          ← SVG orb: ring, glow, concentric rings, text
│   │   ├── WaveCanvas.jsx       ← Canvas 2D: ribbon wings full viewport
│   │   ├── StateBadge.jsx       ← Top-left state pill badge
│   │   ├── MicButton.jsx        ← Center mic toggle button
│   │   ├── StatePanel.jsx       ← Bottom 5-card row
│   │   ├── StateCard.jsx        ← Individual state card + mini canvas
│   │   └── SettingsPanel.jsx    ← Slide-in settings drawer
│   └── lib/
│       ├── stateMachine.js      ← STATE constants + transitions
│       └── ribbonMath.js        ← Waveform math (see spec below) — isolated, testable
├── claude-ops/                  ← This folder. Do not modify.
└── public/
    └── reference.png            ← Screenshot reference (add it yourself)
```

---

## Package Setup

Update `package.json` to add these. Keep existing backend deps:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "node server.js",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^11.0.0",
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "groq-sdk": "^0.3.3"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "nodemon": "^3.1.0"
  }
}
```

**vite.config.js:**
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist' },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
```

**Update server.js** — add one line to serve Vite's `dist/` in production:
```js
// After existing static middleware, add:
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist/index.html')));
}
```

---

## CSS Custom Properties (globals.css)

```css
@import "tailwindcss";

:root {
  --orb-blue:    #4F8BFF;
  --orb-purple:  #9B7BFF;
  --orb-teal:    #00D4FF;
  --orb-magenta: #E91E8C;
  --orb-pink:    #FF6B9D;
  --orb-green:   #10B981;
  --orb-bg:      #000000;
  --orb-surface: rgba(255,255,255,0.04);
  --orb-border:  rgba(255,255,255,0.08);
  --orb-text:    #FFFFFF;
  --orb-muted:   #888888;
  --orb-dim:     rgba(255,255,255,0.06);
}

body {
  background: var(--orb-bg);
  color: var(--orb-text);
  font-family: 'DM Sans', system-ui, sans-serif;
  overflow: hidden;
  height: 100dvh;
  width: 100dvw;
}

/* Google Fonts — add to index.html <head> */
/* DM Sans 400/500/600 + DM Mono 400 */
```

---

## State Machine (lib/stateMachine.js)

```js
export const STATES = {
  IDLE:        'IDLE',
  LISTENING:   'LISTENING',   // mic on, no speech detected
  SPEAKING:    'SPEAKING',    // user speaking (SpeechRecognition interim)
  THINKING:    'THINKING',    // transcript sent, waiting for API
  RESPONDING:  'RESPONDING',  // AI streaming response + TTS speaking
  INTERRUPTED: 'INTERRUPTED', // user spoke while AI was responding
}

export const STATE_COLORS = {
  IDLE:        '#555555',
  LISTENING:   '#00D4FF',
  SPEAKING:    '#4F8BFF',
  THINKING:    '#9B7BFF',
  RESPONDING:  '#E91E8C',
  INTERRUPTED: '#FF6B9D',
}

export const STATE_LABELS = {
  IDLE:        'Idle',
  LISTENING:   'Listening',
  SPEAKING:    'You Speaking',
  THINKING:    'Thinking',
  RESPONDING:  'AI Responding',
  INTERRUPTED: 'Interrupted',
}

export const STATE_ORB_TEXT = {
  IDLE:        ["Tap mic to start", ""],
  LISTENING:   ["I'm listening", "Speak naturally"],
  SPEAKING:    ["", ""],         // replaced by interim transcript
  THINKING:    ["", ""],         // replaced by cycling thinking label
  RESPONDING:  ["", ""],         // replaced by streaming response text
  INTERRUPTED: ["Hold on...", ""],
}

// Cycling thinking labels — rotate every 1200ms in THINKING state
export const THINKING_LABELS = [
  "Searching...",
  "Processing...",
  "Formulating...",
  "Cross-referencing...",
  "Almost there...",
]
```

---

## OrbRing Component (SVG — no Three.js needed)

The orb is pure SVG with CSS filter for glow. This is lighter, crisper, and more controllable than WebGL for a 2D ring.

```jsx
// OrbRing.jsx
// Props: state (STATES.*), text1, text2, amplitude (0-1)

const ORB_SIZE = 420;
const RING_R = 180;   // ring radius
const CX = ORB_SIZE / 2;
const CY = ORB_SIZE / 2;

// SVG structure:
// <defs>
//   <linearGradient id="orbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
//     top-left: var(--orb-blue), bottom-right: var(--orb-purple)
//   </linearGradient>
//   <filter id="orbGlow">
//     <feGaussianBlur stdDeviation="8" result="blur"/>
//     <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
//   </filter>
//   <filter id="orbGlowStrong">   ← used in RESPONDING state
//     <feGaussianBlur stdDeviation="14" result="blur"/>
//     ...
//   </filter>
// </defs>
//
// Concentric ghost rings (3 of them, behind main ring):
// <circle cx={CX} cy={CY} r={RING_R + 20} stroke="rgba(79,139,255,0.06)" strokeWidth="1" fill="none"/>
// <circle cx={CX} cy={CY} r={RING_R + 40} stroke="rgba(79,139,255,0.04)" strokeWidth="1" fill="none"/>
// <circle cx={CX} cy={CY} r={RING_R + 60} stroke="rgba(79,139,255,0.025)" strokeWidth="1" fill="none"/>
//
// Main ring:
// <circle cx={CX} cy={CY} r={RING_R} stroke="url(#orbGrad)" strokeWidth="2" fill="none"
//         filter="url(#orbGlow)"/>
//
// Text group (centered):
// <text x={CX} y={CY - 10} textAnchor="middle" fill="white" fontSize="22" fontWeight="500"
//       fontFamily="DM Sans">{text1}</text>
// <text x={CX} y={CY + 16} textAnchor="middle" fill="#888" fontSize="14" fontWeight="400"
//       fontFamily="DM Sans">{text2}</text>

// Animate:
// - Ring scale pulse: Framer Motion animate={{ scale: [1, 1 + amplitude * 0.06, 1] }} transition={{ repeat: Infinity, duration: 2 }}
// - Concentric rings: each ring Framer Motion animate={{ scale: [1, 1.08], opacity: [0.08, 0] }} staggered delays
// - State color change: animate strokeColor via Framer Motion when state changes
// - RESPONDING: switch filter to orbGlowStrong, strokeWidth to 2.5
```

**Framer Motion animation values per state:**

| State | Ring color | Glow strength | Scale pulse | Pulse speed |
|---|---|---|---|---|
| LISTENING | blue→purple | medium (8px blur) | 1.0→1.03 | 3s loop |
| SPEAKING | blue→purple brighter | strong (12px) | tracks amplitude | realtime |
| THINKING | purple solid | soft (6px) | 1.0→1.02 | 4s loop |
| RESPONDING | magenta→pink | very strong (16px) | 1.0→1.05 | 1.8s loop |
| INTERRUPTED | flash white→pink | burst (24px→6px) | 1.1→1.0 | 400ms once |

---

## WaveCanvas Component — THE WINGS (Read Every Word)

> **This is the most important visual element. Get this right.**

### What It Is

A `<canvas>` element positioned `absolute, inset-0, w-screen h-screen, pointer-events-none`.
It draws two layered closed ribbon paths that run horizontally across the full viewport,
vertically centered at the exact y-coordinate of the orb's center.
The ribbons taper to zero at both screen edges via a `Math.sin(t × π)` envelope —
this is what makes them look like wings spreading from the orb outward.

The orb SVG sits on top of this canvas. The wave passes through the orb visually (canvas behind SVG).

### Audio Setup (in useAudio hook)

```js
// useAudio.js — returns { smoothed, rmsSmoothed, startMic, stopMic, isActive }
// smoothed: Float32Array(64) — per-frame smoothed frequency bins
// rmsSmoothed: number — overall amplitude 0-1

const analyser = audioCtx.createAnalyser();
analyser.fftSize = 128;               // 64 bins
analyser.smoothingTimeConstant = 0.6; // hardware smoothing

// Per-frame exponential smoothing:
// attack fast (k=0.45 when rising), decay slow (k=0.12 when falling)
// This gives that elastic snap-back feel — rises instantly, falls gently
smoothed[i] = cur + (target - cur) * (target > cur ? 0.45 : 0.12);

// RMS from time domain:
analyser.getByteTimeDomainData(timeBuf);
let sum = 0;
for (let s of timeBuf) { const v = (s - 128) / 128; sum += v * v; }
rms = Math.sqrt(sum / timeBuf.length);
rmsSmoothed += (rms - rmsSmoothed) * 0.18;
```

### Ribbon Math (lib/ribbonMath.js)

```js
// drawRibbons(ctx, smoothed, rmsSmoothed, phase, state, canvasW, canvasH)

export function drawRibbons(ctx, smoothed, rms, phase, state, W, H) {
  ctx.clearRect(0, 0, W, H);

  const CY = H / 2;
  const PTS = 90;         // control points — higher = smoother curves
  const span = W;
  
  // State-specific amplitude multiplier
  const ampMap = {
    IDLE: 0.15, LISTENING: 0.5, SPEAKING: 1.0,
    THINKING: 0.2, RESPONDING: 0.7, INTERRUPTED: 0.0
  };
  const ampMult = ampMap[state] ?? 0.5;
  
  // State-specific phase speed (applied externally, passed as phase value)
  // LISTENING: phase += 0.014/frame
  // SPEAKING:  phase += 0.016/frame  
  // THINKING:  phase += 0.007/frame (slow drift)
  // RESPONDING: phase += 0.022/frame (faster flow)

  // Build ribbon A and B point arrays
  const ptsA = [], ptsB = [];

  for (let i = 0; i <= PTS; i++) {
    const t = i / PTS;
    const x = t * span;

    // THE ENVELOPE — do not change this formula
    // sin(t*π) = 0 at edges, 1 at center
    // This is what creates the wing taper
    const env = Math.sin(t * Math.PI);

    // Frequency bin for this x position (maps across 60 of 64 bins)
    const bin = Math.floor(t * 60);
    const mag = ((smoothed[bin] ?? 0) + 0.04) * ampMult;

    // Ribbon A — two sine layers, different frequencies
    const yA = CY
      + Math.sin(t * Math.PI * 2.0   + phase * 1.20)       * 20 * env * (0.35 + mag * 1.6)
      + Math.sin(t * Math.PI * 4.3   + phase * 0.70 + 0.9) *  8 * env * (0.25 + mag * 0.9);

    // Ribbon B — offset phase and frequency for organic layering
    const yB = CY
      + Math.sin(t * Math.PI * 2.4   + phase * 0.90 + 1.2) * 22 * env * (0.35 + mag * 1.4)
      + Math.sin(t * Math.PI * 3.8   + phase * 1.40 + 2.1) *  7 * env * (0.20 + mag * 0.8);

    ptsA.push({ x, y: yA });
    ptsB.push({ x, y: yB });
  }

  // Build closed path strings
  // Forward: wave crest
  // Return: thin flat envelope ~5-7px — gives the ribbon its physical thickness
  function buildPath(pts, flatH) {
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} `;
    for (let i = 1; i < pts.length; i++) {
      d += `L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)} `;
    }
    // Return pass
    for (let i = pts.length - 1; i >= 0; i--) {
      const env = Math.sin((i / PTS) * Math.PI);
      d += `L ${pts[i].x.toFixed(2)} ${(CY + flatH * env).toFixed(2)} `;
    }
    return d + 'Z';
  }

  // State-specific colors
  const colorMap = {
    IDLE:        ['rgba(85,85,85,', 'rgba(85,85,85,'],
    LISTENING:   ['rgba(0,212,255,', 'rgba(107,99,255,'],
    SPEAKING:    ['rgba(79,139,255,', 'rgba(107,99,255,'],
    THINKING:    ['rgba(155,123,255,', 'rgba(107,99,255,'],
    RESPONDING:  ['rgba(233,30,140,', 'rgba(255,107,157,'],
    INTERRUPTED: ['rgba(255,107,157,', 'rgba(255,107,157,'],
  };
  const [cA, cB] = colorMap[state] ?? colorMap.LISTENING;

  // Gradient — horizontal, opacity 0 at edges, peak opacity at center
  const gradA = ctx.createLinearGradient(0, 0, W, 0);
  gradA.addColorStop(0,   cA + '0)');
  gradA.addColorStop(0.5, cA + '0.72)');
  gradA.addColorStop(1,   cA + '0)');

  const gradB = ctx.createLinearGradient(0, 0, W, 0);
  gradB.addColorStop(0,   cB + '0)');
  gradB.addColorStop(0.5, cB + '0.58)');
  gradB.addColorStop(1,   cB + '0)');

  // Draw B first (back layer), then A on top
  ctx.globalCompositeOperation = 'lighter'; // additive blend = glow at overlap

  const pathB = new Path2D(buildPath(ptsB, 7));
  ctx.fillStyle = gradB;
  ctx.fill(pathB);

  const pathA = new Path2D(buildPath(ptsA, 5));
  ctx.fillStyle = gradA;
  ctx.fill(pathA);

  ctx.globalCompositeOperation = 'source-over';

  // Baseline — 1px horizontal line, very low opacity
  ctx.beginPath();
  ctx.moveTo(0, CY);
  ctx.lineTo(W, CY);
  ctx.strokeStyle = `${cA}0.12)`;
  ctx.lineWidth = 1;
  if (state === 'THINKING') ctx.setLineDash([4, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Diamond markers — at local maxima of ribbon A
  drawDiamonds(ctx, ptsA, cA, ampMult);
}

function drawDiamonds(ctx, pts, color, amp) {
  // Find local maxima: where pts[i-1].y > pts[i].y < pts[i+1].y (peak above centerline)
  // Or: find N evenly spaced peaks for cleaner look
  const CY = pts[Math.floor(pts.length / 2)].y; // approximate center
  
  ctx.fillStyle = color + '0.85)';
  
  let peakCount = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1].y;
    const curr = pts[i].y;
    const next = pts[i + 1].y;
    const isPeak = curr < prev && curr < next; // above centerline (lower y = higher up)
    if (!isPeak) continue;
    if (peakCount > 12) break; // max 12 diamonds
    
    ctx.save();
    ctx.translate(pts[i].x, pts[i].y);
    ctx.rotate(Math.PI / 4); // 45° rotation = diamond shape
    const size = 2.5 + amp * 4; // size scales with amplitude
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
    peakCount++;
  }
}
```

### WaveCanvas React Component

```jsx
// WaveCanvas.jsx
import { useRef, useEffect } from 'react';
import { drawRibbons } from '../lib/ribbonMath';

export default function WaveCanvas({ smoothed, rmsSmoothed, state }) {
  const canvasRef = useRef(null);
  const phaseRef = useRef(0);
  const rafRef = useRef(null);

  const phaseSpeed = {
    IDLE: 0.008, LISTENING: 0.014, SPEAKING: 0.016,
    THINKING: 0.007, RESPONDING: 0.022, INTERRUPTED: 0.010
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      phaseRef.current += phaseSpeed[state] ?? 0.014;
      drawRibbons(ctx, smoothed, rmsSmoothed, phaseRef.current, state,
        window.innerWidth, window.innerHeight);
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [state, smoothed, rmsSmoothed]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-screen h-screen pointer-events-none z-10"
    />
  );
}
```

---

## useVoice Hook — Web Speech API

```js
// useVoice.js
// Returns: { transcript, interimTranscript, isListening, startListening, stopListening }

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.interimResults = true;
recognition.lang = 'en-US';

recognition.onresult = (event) => {
  let interim = '';
  let final = '';
  for (const result of event.results) {
    if (result.isFinal) final += result[0].transcript;
    else interim += result[0].transcript;
  }
  setInterimTranscript(interim);
  if (final) {
    setTranscript(final);
    onFinalTranscript(final); // → triggers THINKING state + API call
  }
};

// Interruption: if state === RESPONDING and recognition fires onstart → 
// dispatch INTERRUPTED → cancel TTS → setState SPEAKING
```

---

## useTTS Hook — SpeechSynthesis

```js
// useTTS.js
// Returns: { speak, cancel, isSpeaking, voices, selectedVoice, setSelectedVoice }

function speak(text, onEnd) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = selectedVoice;
  utterance.rate = 1.05;
  utterance.pitch = 1.0;
  utterance.onend = () => { setIsSpeaking(false); onEnd?.(); };
  utterance.onerror = () => { setIsSpeaking(false); onEnd?.(); };
  setIsSpeaking(true);
  window.speechSynthesis.speak(utterance);
}

// Voice selection: filter speechSynthesis.getVoices() for lang starting with 'en'
// Prefer: 'Google US English', 'Samantha', 'Alex', 'Karen'
```

---

## App.jsx — State Machine Orchestration

```jsx
// State flow:
// IDLE → [mic button click] → LISTENING
// LISTENING → [SpeechRecognition onresult interim] → SPEAKING
// SPEAKING → [SpeechRecognition final result] → THINKING → [fetch /api/chat] → RESPONDING
// RESPONDING → [TTS ends] → LISTENING
// RESPONDING → [SpeechRecognition fires] → INTERRUPTED → [400ms] → SPEAKING

// API call:
async function sendToAI(transcript) {
  setState('THINKING');
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: transcript })
  });
  // SSE stream:
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  setState('RESPONDING');
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') { tts.speak(buffer, () => setState('LISTENING')); break; }
      const parsed = JSON.parse(data);
      if (parsed.text) { buffer += parsed.text; setResponseText(buffer); }
    }
  }
}
```

---

## StateBadge Component (Top Left)

```jsx
// Pill badge: "● State Label"
// Dark glass bg, colored dot, mono text
// Framer Motion layout animation on text change
// Position: absolute top-6 left-6 z-50

<motion.div
  layout
  className="absolute top-6 left-6 z-50 flex items-center gap-2 
             px-3 py-1.5 rounded-full border"
  style={{
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(12px)',
    borderColor: `${STATE_COLORS[state]}33`,
  }}
>
  <motion.span
    className="w-2 h-2 rounded-full"
    animate={{ backgroundColor: STATE_COLORS[state] }}
    // Pulse animation on active states
    transition={{ duration: 0.3 }}
  />
  <span className="text-[11px] font-mono uppercase tracking-widest text-white/70">
    {STATE_LABELS[state]}
  </span>
</motion.div>
```

---

## StatePanel — Bottom 5 Cards

```jsx
// 5 cards, full width, always visible
// Each card has its own mini <canvas> with a looping waveform animation
// The active state's card has a colored border

const CARDS = [
  { state: 'LISTENING',   label: 'Listening',    color: '#00D4FF' },
  { state: 'SPEAKING',    label: 'You Speaking', color: '#4F8BFF' },
  { state: 'THINKING',    label: 'Thinking',     color: '#9B7BFF' },
  { state: 'RESPONDING',  label: 'AI Responding',color: '#E91E8C' },
  { state: 'INTERRUPTED', label: 'Interrupted',  color: '#FF6B9D' },
]

// StateCard mini canvas animations:
// LISTENING:    slow gentle sine, ~8px amplitude, teal, 1 diamond
// SPEAKING:     tall bar chart style — use frequencyData bars (simulated), blue
// THINKING:     dotted orbit — 8 dots rotating around center, purple glow center point
// RESPONDING:   smooth double sine wave, magenta, flowing rightward
// INTERRUPTED:  flat line with central starburst — use CSS radial gradient + canvas rays

// THINKING card mini canvas is DIFFERENT from the waveform — special case:
function drawThinkingMini(ctx, phase, W, H) {
  ctx.clearRect(0, 0, W, H);
  const cx = W/2, cy = H/2;
  // Center glow
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
  grad.addColorStop(0, 'rgba(185, 103, 255, 0.9)');
  grad.addColorStop(1, 'rgba(185, 103, 255, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
  // 8 orbiting dots
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + phase;
    const x = cx + Math.cos(angle) * 20;
    const y = cy + Math.sin(angle) * 20;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(107, 99, 255, ${0.4 + 0.4 * Math.sin(angle + phase)})`;
    ctx.fill();
  }
}

// INTERRUPTED card mini canvas:
function drawInterruptedMini(ctx, phase, W, H) {
  ctx.clearRect(0, 0, W, H);
  const cx = W/2, cy = H/2;
  // Flat sine ribbons (magenta)
  // Then starburst from center — 12 lines radiating out, length 4-18px
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const len = 6 + (i % 3) * 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.strokeStyle = `rgba(255, 107, 157, ${0.4 + 0.5 * Math.abs(Math.sin(phase + i))})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Center hot spot
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
  grad.addColorStop(0, 'rgba(255, 107, 157, 1)');
  grad.addColorStop(1, 'rgba(255, 107, 157, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
}
```

---

## SettingsPanel (Slide-in from right)

```jsx
// Framer Motion: x: '100%' → x: 0 on open
// Width 300px, full height, dark glass bg
// Contents:
// - Voice selector: <select> populated from speechSynthesis.getVoices() filtered to en-*
// - Mic sensitivity: <input type="range"> → maps to gain node
// - Orb size: <input type="range" min={300} max={540}> → CSS var --orb-size
// - Reset conversation: <button> → POST /api/new
// - Close button (X) top right
```

---

## MicButton Component

```jsx
// 56px circle, bottom-center of screen, above StatePanel
// position: absolute bottom-[200px] left-1/2 -translate-x-1/2
// Dark glass: bg rgba(255,255,255,0.08), border rgba(255,255,255,0.12)
// Mic icon: heroicons or inline SVG, white, 24px
// Active state: border glows with STATE_COLORS[state], subtle pulse
// On click: toggles mic on/off

<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  animate={{
    boxShadow: isActive
      ? `0 0 0 1px ${STATE_COLORS[state]}66, 0 0 20px ${STATE_COLORS[state]}33`
      : '0 0 0 1px rgba(255,255,255,0.12)'
  }}
  className="absolute bottom-[200px] left-1/2 -translate-x-1/2 
             w-14 h-14 rounded-full flex items-center justify-center z-50"
  style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}
>
  {/* Mic SVG */}
</motion.button>
```

---

## Layout — App.jsx Full Structure

```jsx
// Full viewport, overflow hidden, black bg
// Layer order (z-index):
// z-0:  Three.js canvas (none — we dropped Three.js, not needed)
// z-10: WaveCanvas (canvas, pointer-events-none)
// z-20: OrbRing SVG (centered absolutely, ~420px)
// z-30: HUD elements (StateBadge, title, gear icon)
// z-40: MicButton
// z-50: StatePanel (bottom)
// z-60: SettingsPanel (slide-in, full height)

return (
  <div className="relative w-screen h-screen overflow-hidden bg-black">
    {/* Background radial gradients */}
    <div className="absolute inset-0 z-0" style={{
      background: 'radial-gradient(ellipse at 50% 40%, rgba(79,139,255,0.06) 0%, transparent 60%)'
    }}/>
    
    {/* Waveform wings — behind orb */}
    <WaveCanvas smoothed={smoothed} rmsSmoothed={rmsSmoothed} state={state} />
    
    {/* Orb — centered */}
    <div className="absolute inset-0 flex items-center justify-center z-20">
      <OrbRing state={state} text1={orbText1} text2={orbText2} amplitude={rmsSmoothed} />
    </div>

    {/* Top HUD */}
    <StateBadge state={state} />
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
      <span className="text-[11px] font-mono tracking-[0.2em] text-white/20 uppercase">
        Live Interface Preview
      </span>
    </div>
    <button onClick={() => setSettingsOpen(true)} className="absolute top-5 right-6 z-50 ...">
      {/* Gear SVG */}
    </button>

    {/* Mic button */}
    <MicButton isActive={isMicOn} state={state} onToggle={toggleMic} />

    {/* State panel */}
    <StatePanel currentState={state} />

    {/* Settings */}
    <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
  </div>
);
```

---

## Tailwind Utilities to Add (tailwind.config.js)

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{jsx,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        orb: {
          blue:    '#4F8BFF',
          purple:  '#9B7BFF',
          teal:    '#00D4FF',
          magenta: '#E91E8C',
          pink:    '#FF6B9D',
          green:   '#10B981',
        }
      }
    }
  }
}
```

---

## Build + Deploy

After you build:
```bash
npm run build    # → produces dist/
```

Server.js already serves `dist/` in production via the static middleware addition above.
Render runs `npm run build && node server.js` — wire that in `render.yaml` buildCommand.

Commit everything to `main`. Claude Code will review and deploy.

---

## Log Your Work

After each session append to `claude-ops/GROK_LOG.md`:
```
## [DATE] — [What you built]
Files created/modified:
What works:
What needs Claude Code review:
```

---

## Priority Order

1. `index.html` + `vite.config.js` + `tailwind.config.js` — scaffold
2. `src/lib/ribbonMath.js` — waveform math, test it standalone first
3. `src/hooks/useAudio.js` — mic + AnalyserNode
4. `src/components/WaveCanvas.jsx` — connect audio to canvas
5. `src/components/OrbRing.jsx` — SVG orb with glow filters
6. `src/lib/stateMachine.js`
7. `src/App.jsx` — layout + state machine wiring
8. `src/components/StateBadge.jsx`
9. `src/components/MicButton.jsx`
10. `src/components/StatePanel.jsx` + `StateCard.jsx` — mini canvases last (most complex)
11. `src/hooks/useVoice.js` + `src/hooks/useTTS.js` — voice pipeline
12. `src/components/SettingsPanel.jsx`

**Go.**
