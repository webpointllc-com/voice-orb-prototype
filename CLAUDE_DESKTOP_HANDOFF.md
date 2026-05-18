# Voice Orb — Prototype C handoff to Claude Desktop

You're picking up from Claude Code. The **bones are solid**: 10/10 Playwright tests pass, server is stable, the state machine works, Render deployment is wired. **Your job is the visual layer — push it to Siri-quality HD.** Do not change the state machine, server, tests, or core function unless you absolutely must.

## What works (do not touch)

- `/api/state` event endpoint and the in-memory state machine in `server.js`
- The 9-state machine in `public/index.html` (IDLE → LISTENING → SPEAKING → THINKING → RESPONDING → FAILED → INTERRUPTED → SIMULATE → ERROR)
- Test seam `window.voOrbTest.{phraseMatch, phraseFail, setRms}` — Playwright relies on this
- `tests/voice-orb.spec.ts` — 10 tests, all green. **Run `npm test` before any commit.**
- The `pill` / phrase / mic button DOM. The text "My Voice Is My Password" with karaoke shimmer.

## Where the visuals live

Everything is Canvas2D in one file: `public/index.html`. Look for:

| Function | What it owns |
|---|---|
| `drawConcentricRings(cx, cy, baseR)` | 5 echo rings radiating outward from the orb |
| `drawStateVisual(cx, cy, ringR)` | Dispatches to the per-state renderer (ripple/bars/comet/mouth) |
| `drawRipple(cx, cy, ringR)` | **IDLE / LISTENING / SIMULATE wings** — vertical bars + diamond nodes. This is what you'll iterate on most. |
| `drawBars` / `drawComet` / `drawMouth` | Other-state visualizers |
| `drawMainRing(cx, cy, baseR)` | The neon ring itself — 3-layer stroke (outer glow, core, razor highlight), plus inner radial-gradient orb fill and outer bloom |
| `sampleSpectrum()` | FFT smoothing + procedural fallback when no mic. The `Live.simulate` branch generates fake voice data. |

## Pixel-perfect targets (the gap)

Reference: Siri-grade voice UI. Compare against the prototype right now and close these gaps:

1. **Wings need more presence at idle.** Right now `drawRipple` draws bars but they're modest in narrow viewports. Reference shows tall, varied bars with prominent diamond highlights. Tune `BAR_W`, `SPACING`, `MAX_H`, the procedural data in `sampleSpectrum`, and the alpha curve in `drawSideBars`.
2. **Ring stroke could be brighter on energy peaks.** The 3-layer stroke is correct in structure — outer halo (gw*2.8 wide, soft colors) + mid glow (gw*1.2) + razor highlight (1px). On loud audio, push the lineWidth and alpha further. The `drive` variable in `drawMainRing` controls this.
3. **Echo rings could pulse with energy.** `drawConcentricRings` reads `rms` and `Live.amp` — give it more punch on speech onset, decay slowly.
4. **Diamond nodes are conditional** (`if (amp > 0.20 && i < N - 3)`). Lower the threshold or make them always-on at reduced size — the reference has them everywhere.
5. **Per-state color palettes** live in `STATES` near line 289. Each state has `L` (left wing) and `R` (right wing) RGB triples plus `speed` and `amp` modulators. Tune these for emotional fit.

## Constraints you must respect

- **Canvas2D only** (no WebGL — keeps the bundle small and the test surface stable)
- **Single file** — `public/index.html` is intentionally monolithic for portability. Don't split it.
- **All 10 tests must pass** after your changes. Run `npm test` from the prototype directory.
- **Mobile-first sizing** — the canvas uses `getBoundingClientRect()` and CSS pixels. Viewports as narrow as 360px must look correct.
- **No new dependencies** without a strong reason — the dependency list in `package.json` is curated.

## How to iterate fast

1. `node server.js` — boot the server
2. Open `http://localhost:3000` in Chrome
3. Edit `public/index.html`, refresh the browser
4. When happy: `npm test` → 10/10 → commit

`window.applyState('SIMULATE')` from the DevTools console will let you preview the demo state without a mic.

## Deploy

`git push origin main` → Render auto-deploys from `render.yaml`. Public URL is in the Render dashboard for the `voice-orb-prototype` service.

## What's intentionally minimal

- No state preview cards at the bottom — the reference image has them; the current build does not. **Adding those is fair game** if it doesn't break the existing layout.
- Reduced-motion users get static visuals (`prefers-reduced-motion: reduce`). Honor this.

— Claude Code, signing off. Pixel-perfect from here is yours.
