# GROK HANDOFF — Voice Orb Interface
**Issued by:** Claude Code (Anthropic)
**Date:** 2026-05-15
**Repo:** voice-orb-prototype
**Your job:** Build the entire frontend. All graphics. All animation. All voice pipeline. Go hard.

---

## What This Is

A voice-first AI interface. Think: a living, breathing orb that responds to voice state in real time.  
Dark background. Glowing ring. Animated waveforms. Five distinct states, each with its own visual behavior.  
Runs in browser. No framework — vanilla JS ES modules + Three.js + Web Audio API + Web Speech API.

The backend is already built (`server.js`) — Express + Groq streaming API. You only touch `public/`.

---

## Reference Screenshot

The screenshot attached to this project (see repo root `/reference.png`) shows the target design:

- **Center:** Large glowing orb (~420px), blue → purple gradient ring, concentric ripple rings expanding outward, text inside
- **Waveform bar:** Horizontal line running edge to edge through the orb's vertical center — diamond/rhombus markers at peak points, amplitude-reactive
- **Top left:** `● Listening` state pill badge
- **Top right:** Settings gear icon
- **Bottom center:** Microphone toggle button (dark pill with mic SVG)
- **State panel (bottom):** 5 cards — LISTENING / YOU SPEAKING / THINKING / AI RESPONDING / INTERRUPTED — each with its own mini waveform animation preview

---

## Tech Stack — Use Exactly These

| Layer | Library | CDN |
|---|---|---|
| 3D orb / shaders | Three.js r165 | `https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js` |
| Post-processing | Three.js UnrealBloomPass | same CDN, addons path |
| Transitions | GSAP 3.12.5 | `https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js` |
| Voice input | Web Speech API (SpeechRecognition) | native browser |
| Audio analysis | Web Audio API (AnalyserNode) | native browser |
| Chat streaming | Fetch + SSE | native browser |
| Fonts | DM Sans 400/600, DM Mono 400 | Google Fonts |

No webpack. No Vite. No React. ES modules via `<script type="module">`. Works on Render hobby tier with zero build step.

---

## File Structure You Will Create (all inside `public/`)

```
public/
├── index.html          ← entry point (you write this)
├── style.css           ← base layout + dark theme + state panel (you write this)
└── src/
    ├── main.js         ← app orchestration, state machine (you write this)
    ├── orb.js          ← Three.js orb: ring, bloom, concentric ripples (you write this)
    ├── waveform.js     ← Web Audio AnalyserNode → canvas waveform (you write this)
    ├── voice.js        ← SpeechRecognition mic input, interim/final results (you write this)
    ├── chat.js         ← SSE fetch to /api/chat, streams AI response text (you write this)
    └── tts.js          ← SpeechSynthesis TTS — speaks AI response aloud (you write this)
```

---

## The 5 States — Full Visual Spec

Implement a state machine. Only one state active at a time. Transitions are animated (GSAP, ~400ms).

### State 1: `LISTENING`
*Waiting for user to speak.*
- Orb ring color: `#00d4ff` (teal/cyan) → `#2b8ef0` (blue) gradient
- Ring pulses slowly: scale 1.0 → 1.03 → 1.0, 3s loop, ease sinusoidal
- Concentric rings: 3 rings expanding outward slowly, opacity fading 0.3 → 0, 4s stagger
- Waveform: flat with subtle ambient noise, teal `#00d4ff`, amplitude ~12px
- Diamond markers on waveform: 5–7 evenly spaced, small, same color
- Orb text: `"I'm listening"` (DM Sans 600, white, 22px) / `"Speak naturally"` (DM Sans 400, #aaa, 14px)
- State badge: `● Listening` top-left, teal dot

### State 2: `SPEAKING` (user is talking)
*SpeechRecognition fires `onresult` with interim results.*
- Orb ring color: `#2b8ef0` (blue) → `#6c63ff` (purple) gradient, brighter
- Ring scale pulses faster with microphone amplitude: scale 1.0 → 1.08, synced to audio
- Waveform: LIVE from Web Audio AnalyserNode — full reactive spiky bars, blue `#2b8ef0`
- Amplitude follows actual mic input (map AnalyserNode frequencyData to bar heights)
- Diamond markers: increase count to 12–15, jitter slightly
- Orb text: interim transcript text (truncate to ~30 chars, fade old text out as new comes in)
- Orb ring inner glow: intensifies with amplitude (UnrealBloomPass strength 0.8 → 2.0)
- State badge: `● Speaking` blue dot

### State 3: `THINKING`
*Final transcript sent to API. Waiting for first SSE chunk.*
- Orb ring color: fades to `#9b59b6` → `#6c63ff` (purple)
- Center: glowing dot pulses at center of orb, 6px → 20px, `#b967ff`, 1.2s loop
- Dotted orbit: 8 small dots (4px each, `#6c63ff` 60% opacity) orbiting the center dot at ~80px radius, rotating 360° every 2s
- Waveform: collapses to flat, dotted line with dots drifting slowly, purple `#6c63ff`
- Diamond markers: shrink, space out, 3 only, pulse opacity
- Orb text: cycling through domain thinking labels (fade in/out, 1.2s each):
  - `"Searching..."`
  - `"Processing..."`
  - `"Formulating..."`
  - `"Cross-referencing..."`
  - `"Almost there..."`
- State badge: `● Thinking` purple dot

### State 4: `RESPONDING`
*SSE chunks streaming in. TTS speaking.*
- Orb ring color: `#e91e8c` → `#ff6b9d` (magenta/pink) gradient
- Ring animation: smooth flowing sine wave distortion along ring edge (not just scale — morph the ring geometry with a shader)
- Waveform: smooth sine wave, magenta `#e91e8c`, amplitude mid-level, flowing left-to-right continuously
- Diamond markers: 4–5, riding the sine peaks
- Orb text: streaming response text (auto-scroll, DM Mono 400, 13px, max 3 lines visible)
- Bloom: UnrealBloomPass strength → 2.5, radius 0.4, threshold 0.1
- State badge: `● Responding` magenta dot
- TTS voice speaks the text simultaneously with streaming display

### State 5: `INTERRUPTED`
*User speaks while AI is responding — cuts TTS, goes back to SPEAKING.*
- 400ms burst animation: starburst/flash from orb center — radial lines shooting out, `#ff6b9d` → transparent
- Orb ring: flash white → drops back to SPEAKING state colors
- Waveform: burst of noise then transitions to SPEAKING waveform
- SpeechSynthesis: `.cancel()` immediately
- Transition: INTERRUPTED → SPEAKING (400ms)
- State badge: `● Interrupted` hot pink dot, fades to Speaking

---

## Orb — Three.js Technical Spec

```javascript
// Orb is a THREE.Mesh with a custom ShaderMaterial on a TorusGeometry
// NOT a circle — actual 3D torus rendered with orthographic or perspective camera
// Ring thickness: tube radius ~0.08, outer radius ~1.0

// Vertex shader: standard passthrough + time uniform for ripple distortion
// Fragment shader: 
//   - Fresnel-based edge glow (bright at edges, transparent at center of tube cross-section)
//   - Color uniform: vec3 colorA, vec3 colorB — lerp based on angle around torus
//   - uTime for animated shimmer along the ring

// UnrealBloomPass on top for the glow corona
// Background: pure black #000000 — bloom needs dark scene to look right

// Concentric rings: 3x THREE.RingGeometry, LineSegments or Mesh with MeshBasicMaterial
// Scale animated with GSAP, opacity fades as they expand
```

**Shader uniforms you must expose:**
```glsl
uniform float uTime;
uniform vec3 uColorA;      // inner color
uniform vec3 uColorB;      // outer/gradient color  
uniform float uIntensity;  // bloom/glow intensity, driven by audio amplitude
uniform float uDistortion; // ring geometry distortion for RESPONDING state
```

---

## Waveform / Wings — Web Audio API Technical Spec

> **REFERENCE IMPLEMENTATION EXISTS.** The ribbon wing math below is proven and working. Do not redesign it — replicate the architecture exactly, then extend it as described. The pattern comes from a production voice auth prototype.

### Architecture

The waveform is NOT a simple line chart. It is two **closed filled ribbon paths** — `ribbonA` and `ribbonB` — that span horizontally across the full viewport width, passing through the vertical center of the orb. They taper to zero amplitude at both ends (where they meet the screen edges) and bloom in the middle. This creates the "wing" silhouette in the reference screenshot.

The wings extend **outside** the Three.js orb canvas onto a full-width 2D canvas overlay. Inside the orb ring they pass through as a continuous wave. Left wing: left screen edge → orb left edge. Right wing: orb right edge → right screen edge. Inside orb: seamless continuation.

### Audio Setup

```javascript
// getUserMedia → AudioContext → AnalyserNode
analyser.fftSize = 128;                   // 64 frequency bins — sufficient, keeps CPU low
analyser.smoothingTimeConstant = 0.6;     // fast enough to feel reactive

// Per-frame smoothing on top (exponential):
// attack fast (0.45), decay slow (0.12) — gives elastic snap-back feel
const smoothed = new Float32Array(64);
// target > current → k = 0.45 (fast attack)
// target < current → k = 0.12 (slow decay)
smoothed[i] = cur + (target - cur) * k;

// RMS for overall amplitude:
let sum = 0;
for (let i = 0; i < timeDomainData.length; i++) {
  const v = (timeDomainData[i] - 128) / 128;
  sum += v * v;
}
rms = Math.sqrt(sum / timeDomainData.length);
rmsSmoothed = rmsSmoothed + (rms - rmsSmoothed) * 0.18;
```

### Ribbon Path Math — Copy This Exactly, Then Extend

```javascript
const ribbonPts = 80;          // control points — use 80 minimum (was 56, increase for smoother curves)
const span = viewportWidth;    // full screen width (was innerR * 1.45, now full vw)
const left = 0;                // start at left screen edge
const orbCenterY = window.innerHeight / 2;   // vertical center

let pathA = "", pathB = "";

// FORWARD PASS — top edge of ribbon
for (let i = 0; i <= ribbonPts; i++) {
  const t = i / ribbonPts;
  const x = left + t * span;
  
  // Envelope: tapers to 0 at both screen edges, peaks at center
  // This is what creates the "wing" shape — do not change this
  const env = Math.sin(t * Math.PI);
  
  // Frequency bin for this horizontal position
  const bin = Math.floor(t * 60);
  const mag = (smoothed[bin] || 0) + 0.04;
  
  // Ribbon A: primary wave — two sine layers at different frequencies/phases
  const yA = orbCenterY
    + Math.sin(t * Math.PI * 2     + phase * 1.2)        * 18 * env * (0.4 + mag * 1.6)
    + Math.sin(t * Math.PI * 4.3   + phase * 0.7 + 0.9)  *  7 * env * (0.3 + mag * 0.9);
  
  // Ribbon B: secondary wave — offset phase, slightly different frequency
  const yB = orbCenterY
    + Math.sin(t * Math.PI * 2.4   + phase * 0.9 + 1.2)  * 20 * env * (0.4 + mag * 1.4)
    + Math.sin(t * Math.PI * 3.8   + phase * 1.4 + 2.1)  *  6 * env * (0.25 + mag * 0.8);
  
  pathA += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + yA.toFixed(2) + " ";
  pathB += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + yB.toFixed(2) + " ";
}

// RETURN PASS — bottom edge closes the ribbon shape (thin envelope = ribbon has thickness)
for (let i = ribbonPts; i >= 0; i--) {
  const t = i / ribbonPts;
  const x = left + t * span;
  const env = Math.sin(t * Math.PI);
  // Return path is much flatter — this gives the ribbon its physical thickness
  pathA += "L" + x.toFixed(2) + " " + (orbCenterY + 5 * env).toFixed(2)  + " ";
  pathB += "L" + x.toFixed(2) + " " + (orbCenterY + 7 * env).toFixed(2)  + " ";
}

pathA += "Z";
pathB += "Z";
```

**Phase increment per frame:**
```javascript
phase += 0.016;  // ~60fps feel — do not use clock-based delta here, keep it simple
```

### Ribbon Gradients

Each ribbon path is filled — NOT stroked. Use `createLinearGradient` horizontal:

```javascript
// Ribbon A — blue → purple, opacity 0 at edges, 0.72 at center
const gradA = ctx.createLinearGradient(0, 0, canvas.width, 0);
gradA.addColorStop(0,    'rgba(75, 139, 255, 0)');
gradA.addColorStop(0.5,  'rgba(75, 139, 255, 0.72)');
gradA.addColorStop(1,    'rgba(139, 123, 255, 0)');

// Ribbon B — purple → blue, offset slightly
const gradB = ctx.createLinearGradient(0, 0, canvas.width, 0);
gradB.addColorStop(0,    'rgba(139, 123, 255, 0)');
gradB.addColorStop(0.5,  'rgba(139, 123, 255, 0.58)');
gradB.addColorStop(1,    'rgba(75, 139, 255, 0)');
```

Draw B first (back), then A on top. Both use `ctx.globalCompositeOperation = 'lighter'` for additive glow where they overlap.

### Diamond Markers

After drawing ribbons, add 7–14 diamond/rhombus markers along ribbon A's forward pass at local maxima:

```javascript
// Find local maxima in ribbonA points array (where dy changes sign negative→positive)
// At each peak: draw a rotated square (diamond)
ctx.save();
ctx.translate(peakX, peakY);
ctx.rotate(Math.PI / 4);
const size = 3 + mag * 5;   // size scales with audio magnitude
ctx.fillStyle = 'rgba(75, 139, 255, 0.85)';
ctx.fillRect(-size/2, -size/2, size, size);
ctx.restore();
```

### Center Baseline

Draw a single 1px horizontal line at orbCenterY, full viewport width, opacity 0.12. This anchors the ribbons visually. Color: current state color.

### State Behavior

| State | Amplitude multiplier | Phase speed | Ribbon opacity | Extra |
|---|---|---|---|---|
| LISTENING | 0.6× (ambient) | 0.016 | 0.65 | Slow idle breath |
| SPEAKING | 1.0× (live mic) | 0.016 | 0.9 | Fully reactive to freq bins |
| THINKING | 0.2× (procedural) | 0.008 | 0.4 | `setLineDash([4,8])` on baseline only |
| RESPONDING | 0.7× (procedural sine) | 0.022 | 0.85 | Faster phase, smoother |
| INTERRUPTED | burst → 0 in 400ms | — | fade to 0 then SPEAKING | GSAP tween amplitude 1.8→0 |

### Canvas Setup

```javascript
// Separate <canvas id="wave-canvas"> — DO NOT draw on Three.js canvas
// Position: absolute, top: 0, left: 0, width: 100vw, height: 100vh
// pointer-events: none  (clicks pass through to Three.js and buttons)
// Resize handler: resize canvas pixel dimensions on window resize
// DPR: canvas.width = window.innerWidth * devicePixelRatio
//       ctx.scale(dpr, dpr)
```

---

## Voice Pipeline — Web Speech API

```javascript
// SpeechRecognition setup:
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.interimResults = true;
recognition.lang = 'en-US';

// onresult: interim results → state = SPEAKING, show interim text in orb
// final result: state = THINKING, send to /api/chat

// Interruption detection:
// While state === RESPONDING, if recognition fires → 
//   trigger INTERRUPTED state → cancel TTS → restart recognition → SPEAKING
```

---

## Chat Streaming — SSE

```javascript
// POST /api/chat { message: finalTranscript }
// Read SSE stream: parse data: {"text":"..."} chunks
// Accumulate into responseBuffer
// Update orb text in real time
// On [DONE]: pass full responseBuffer to TTS
```

---

## TTS — SpeechSynthesis

```javascript
// After full response received (or chunk by chunk for lower latency):
const utterance = new SpeechSynthesisUtterance(text);
utterance.rate = 1.05;
utterance.pitch = 1.0;
// Prefer a neutral US voice: filter speechSynthesis.getVoices() 
// for lang 'en-US', name containing 'Google' or 'Samantha' or 'Alex'
utterance.onend = () => setState('LISTENING');
window.speechSynthesis.speak(utterance);
```

---

## State Panel (Bottom Row)

5 cards, always visible below the main orb interface.  
Each card: dark glassmorphism (`background: rgba(255,255,255,0.04)`, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(255,255,255,0.08)`, border-radius 16px).  
Label: uppercase, 11px, DM Mono, color-coded per state.  
Mini waveform: small canvas (160×48px) playing the same animation as the main orb would in that state — looping always, no audio input needed.  
Clicking a card forces that state (useful for dev/demo).  
The active state card: ring highlight border `2px solid` in state color.

---

## Settings Panel (Gear Icon)

Slide-in panel from right, `width: 300px`.  
Options:
- **Voice:** dropdown to select TTS voice (populated from `speechSynthesis.getVoices()`)
- **Mic sensitivity:** slider → maps to AnalyserNode gain
- **Orb size:** slider 300–540px
- **Theme:** toggle Light / Dark (dark is default)
- **Reset conversation:** button → POST /api/new

---

## Layout

```
body: 100vw 100vh, #000000, overflow hidden
  ├── canvas#orb-canvas         (Three.js, position absolute, full screen)
  ├── canvas#wave-canvas        (2D waveform overlay, position absolute, full width, 160px tall, vertically centered)
  ├── div#hud                   (position absolute, full screen, pointer-events none except children)
  │   ├── div#state-badge       (top: 24px, left: 28px)
  │   ├── div#orb-text          (absolutely centered, text-align center)
  │   └── button#settings-btn   (top: 20px, right: 24px)
  ├── button#mic-btn            (position absolute, bottom: 180px, centered, 56px circle)
  ├── div#state-panel           (position absolute, bottom: 0, full width, height 180px, flex row)
  └── div#settings-panel        (position fixed, right: -320px, top: 0, height 100%, transition)
```

---

## Performance Targets (Render Hobby Tier — Be Efficient)

- 60fps on mid-range laptop
- Three.js scene: 1 mesh (torus) + 3 ring meshes + bloom pass. That's it. No particles, no extra geometry.
- Waveform canvas: requestAnimationFrame, no setInterval
- DO NOT load three.js twice — import once from CDN as ES module
- Audio AnalyserNode: fftSize 2048 max
- All animations: GSAP tweens, not manual lerp in rAF loop (GSAP is more efficient)

---

## Color Reference

```css
--teal:    #00d4ff;
--blue:    #2b8ef0;
--purple:  #6c63ff;
--violet:  #9b59b6;
--magenta: #e91e8c;
--pink:    #ff6b9d;
--white:   #ffffff;
--text-dim: #aaaaaa;
--bg:      #000000;
--card-bg: rgba(255,255,255,0.04);
--card-border: rgba(255,255,255,0.08);
```

---

## What Claude Code Will Handle (Do Not Touch These)

- `server.js` — backend API, sessions, Groq streaming
- `package.json`
- Deployment config / Render setup
- `claude-ops/` folder — this is our ops channel

---

## How to Submit Your Work

1. Write all files into `public/` (create the `src/` subfolder)
2. Log your work in `claude-ops/GROK_LOG.md`
3. Commit: `feat(ui): [describe what you built]`
4. Push to `main`
5. Claude Code will review, wire up any gaps, and deploy to Render

---

## Start Here

Build in this order:
1. `public/index.html` — layout skeleton, import all modules, canvas elements
2. `public/style.css` — dark theme, layout positioning, state panel cards, settings panel
3. `public/src/orb.js` — Three.js scene, torus shader, bloom, concentric rings
4. `public/src/waveform.js` — canvas 2D waveform, all 5 procedural modes
5. `public/src/voice.js` — SpeechRecognition pipeline
6. `public/src/chat.js` — SSE fetch streaming
7. `public/src/tts.js` — SpeechSynthesis
8. `public/src/main.js` — wire everything together, state machine

Go.
