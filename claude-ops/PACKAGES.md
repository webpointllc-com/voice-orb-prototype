# PACKAGES — verified, pinned, with sources

Every package the project uses, why we picked it, what version, and the
URL where its current docs live. Do not bump versions without updating
this file.

## Frontend — zero dependencies

The orb is intentionally framework-free. Built-ins only:

| API | Used for | Notes |
|---|---|---|
| Web Speech API (`webkitSpeechRecognition`) | Phrase recognition in-browser | Chrome / Edge / Safari. Firefox has no support; orb falls back to `SIMULATE`. |
| Web Audio API (`AnalyserNode`) | FFT for SPEAKING state bars + RMS for prompt-fill effect | Universal. |
| MediaRecorder | Capturing audio for `/api/transcribe` | Universal. |
| `requestAnimationFrame` | All animation | Universal. |
| Canvas2D | All rendering | Universal. |

External resource: **Poppins font** via Google Fonts. Self-host if Drew's
corporate venue blocks fonts.googleapis.com — see `docs/ARCHITECTURE.md`.

## Node.js / main server

```json
{
  "engines": { "node": "20.x" },
  "dependencies": {
    "express": "4.21.2",
    "http-proxy-middleware": "3.0.3",
    "compression": "1.7.5",
    "helmet": "8.0.0",
    "morgan": "1.10.0"
  },
  "devDependencies": {
    "@playwright/test": "1.49.1"
  }
}
```

| Package | Why | Docs |
|---|---|---|
| `express@4.21.2` | Mature, what Render expects, what Drew already has | https://expressjs.com/ |
| `http-proxy-middleware@3.0.3` | Proxy `/api/*` to the Python services without CORS pain | https://github.com/chimurai/http-proxy-middleware |
| `compression@1.7.5` | Gzip Canvas2D-heavy HTML payload | https://github.com/expressjs/compression |
| `helmet@8.0.0` | Sensible security headers; corporate demo environments check these | https://helmetjs.github.io/ |
| `morgan@1.10.0` | Access log → stdout → Render log feed for the `/admin` audit table | https://github.com/expressjs/morgan |
| `@playwright/test@1.49.1` | Test runner with fake-media flag support; latest as of cutoff | https://playwright.dev/docs/intro |

## Python — ASR service (`server/whisper_service.py`)

```
# requirements-whisper.txt
fastapi==0.115.6
uvicorn[standard]==0.32.1
faster-whisper==1.0.3
python-multipart==0.0.20
```

| Package | Why | Docs |
|---|---|---|
| `fastapi==0.115.6` | Async by default, OpenAPI for free, low overhead | https://fastapi.tiangolo.com/ |
| `uvicorn[standard]==0.32.1` | ASGI server, `[standard]` pulls in uvloop + httptools | https://www.uvicorn.org/ |
| `faster-whisper==1.0.3` | CTranslate2 reimplementation of Whisper, 4× faster than `openai-whisper`, lower memory, MIT license. Same model files. | https://github.com/SYSTRAN/faster-whisper |
| `python-multipart==0.0.20` | FastAPI needs this for file uploads (the audio chunk POST) | https://github.com/Kludex/python-multipart |

**Model**: `tiny.en` (75 MB) is sufficient for the passphrase "my voice is
my password". Drew can swap to `base.en` (142 MB) if accuracy matters more
than cold-start time.

## Python — biometric service (`server/ecapa_service.py`) [Phase B stretch]

```
# requirements-ecapa.txt
fastapi==0.115.6
uvicorn[standard]==0.32.1
speechbrain==1.0.2
torch==2.5.1
torchaudio==2.5.1
python-multipart==0.0.20
```

| Package | Why | Docs |
|---|---|---|
| `speechbrain==1.0.2` | The reference toolkit for ECAPA-TDNN inference | https://speechbrain.readthedocs.io/ |
| `torch==2.5.1` + `torchaudio==2.5.1` | SpeechBrain's runtime; CPU build is fine | https://pytorch.org/ |

**Model**: `speechbrain/spkrec-ecapa-voxceleb` from HuggingFace. Auto-downloads
on first `SpeakerRecognition.from_hparams(...)` call. ~22 MB.

Reference snippet (from SpeechBrain official docs):

```python
from speechbrain.inference.speaker import SpeakerRecognition
verification = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="pretrained_models/spkrec-ecapa-voxceleb",
)
score, prediction = verification.verify_files("enroll.wav", "verify.wav")
# score: tensor([0.6952]), prediction: tensor([True])  → same speaker
# score: tensor([0.0159]), prediction: tensor([False]) → different speaker
```

Threshold is built-in (Equal Error Rate point from VoxCeleb). For a demo,
treat `prediction==True` as pass.

## Testing — Playwright fake-media

Playwright drives Chromium with three flags that make audio testing real:

```bash
--use-fake-device-for-media-stream      # virtual mic instead of hardware
--use-fake-ui-for-media-stream          # skip the permission prompt
--use-file-for-fake-audio-capture=PATH  # pipe a WAV file as mic input
```

Source: https://playwright.dev/docs/api/class-browsertype#browser-type-launch
(see `args`), and the verified pattern from the maddevs.io 2024 writeup
and Microsoft Playwright issue #27436 (linked in repo PRs).

**WAV format**: 16 kHz mono PCM. Chrome will hang on stereo or non-PCM.
`scripts/generate-fixtures.sh` produces compliant files.

## What we explicitly did NOT pick (and why)

| Rejected | Reason |
|---|---|
| `openai-whisper` (vanilla) | 4× slower than `faster-whisper`, same model files. No upside. |
| OpenAI Whisper API | Per-minute pricing, network dependency, customer data leaves the venue. Whisper API is fine for non-sensitive demos but Drew's clients hold tax data. |
| `whisper.cpp` WASM in browser | 75–142 MB model load on cold start, hot phones, "works but not product-ready" per the VORA writeup (vibed-lab.com). Browser path stays on Web Speech API. |
| React / Vue / Svelte | Drew's accessibility tooling fights renderer-managed DOM. Vanilla JS is non-negotiable. |
| Tailwind / CSS-in-JS | Single-file orb. Inline `<style>` is the convention. |
| Resemblyzer | Smaller and faster than ECAPA-TDNN but with measurable accuracy gap. For a corporate-grade demo, ECAPA-TDNN is the bar. |
| pyannote.audio | Excellent for diarization, overkill for 1:1 verification. |
| Web Speech API as the only ASR | Browser-dependent, Firefox doesn't ship it, recognition quality varies. We use it as a **fast path** and fall back to Whisper for verification. |
