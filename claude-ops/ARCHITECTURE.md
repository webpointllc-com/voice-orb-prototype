# ARCHITECTURE — voice-orb

Three runtime layers, deployed as three Render services, glued by Express.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                     │
│                                                                          │
│   public/index.html  ──── Canvas2D orb + Web Speech API + MediaRecorder │
│                                                                          │
│        │                                  │                              │
│        │ (state events)                   │ (2-second audio chunks)      │
│        ▼                                  ▼                              │
└────────┼──────────────────────────────────┼──────────────────────────────┘
         │                                  │
         │   POST /api/state                │   POST /api/transcribe
         │   POST /api/verify (optional)    │   POST /api/verify
         │                                  │
         ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NODE / EXPRESS  (server.js)                       Render service #1     │
│                                                                          │
│  • serves public/                                                        │
│  • logs /api/state to ring buffer (last 50) for /admin                  │
│  • http-proxy-middleware forwards /api/transcribe → :8001               │
│  • http-proxy-middleware forwards /api/verify     → :8002               │
└─────────────────────────────────────────────────────────────────────────┘
                │                                  │
                ▼                                  ▼
┌──────────────────────────┐         ┌──────────────────────────┐
│  FastAPI Whisper bridge  │         │ FastAPI ECAPA-TDNN       │
│  (faster-whisper, CPU)   │         │ (SpeechBrain, CPU)       │
│  Render service #2 :8001 │         │ Render service #3 :8002  │
│                          │         │                          │
│  POST /transcribe        │         │ POST /verify             │
│  → { text: "..." }       │         │ → { score, same_speaker }│
└──────────────────────────┘         └──────────────────────────┘
```

## Why three services and not one Python monolith

- **Cold-start isolation**: SpeechBrain pulls in PyTorch (~600 MB). Whisper
  doesn't need PyTorch and boots much faster. Keeping them separate means
  the ASR path stays hot on a tiny Render instance while the biometric
  service can be sized larger and woken on demand.
- **Render service tiers**: Express on a free hobby plan is fine. Whisper
  needs the $7/mo "starter" CPU tier (the free tier OOMs on tiny.en cold
  start). ECAPA-TDNN can stay free-tier with `sleep`-on-idle for demo use.
- **Failure containment**: If the biometric service crashes mid-demo, ASR
  still works and the orb falls back to text-only PASS/FAIL.

## Request flow — happy path

1. User clicks mic. Browser requests `getUserMedia`. Granted.
2. Orb transitions IDLE → LISTENING. Web Speech API starts.
3. User says "my voice is my password". MediaRecorder accumulates audio.
4. Web Speech API fires `onresult` with matching transcript.
5. Orb transitions LISTENING → THINKING (700ms hold). MediaRecorder stops
   and POSTs the last 2 seconds of audio to `/api/transcribe` (and, if
   enabled, `/api/verify` with the enrolled reference WAV).
6. Express proxies to the Python services. Both return JSON within ~400ms.
7. Orb checks: did Whisper agree the phrase was spoken? (Yes.) Did
   ECAPA-TDNN agree it's the enrolled speaker? (Yes, score ≥ 0.65.)
8. Orb transitions THINKING → RESPONDING. h1 reads "You passed". Mouth
   glow blooms green from the orb center for 2000ms.
9. Orb returns to LISTENING. Web Speech API restarts.

## Request flow — fail path

1–4. Same as above, but user says something other than the phrase.
5. Web Speech API's final result doesn't match. `recog.onresult` calls
   `onPhraseFailed()`.
6. Orb transitions LISTENING → THINKING (600ms).
7. Orb transitions THINKING → FAILED. h1 reads "Sorry, try again". Mouth
   glow blooms red/amber for 2400ms.
8. Orb returns to LISTENING.

Server is **not contacted** on the failure path in Phase A (the orb decides
locally from the transcript). In Phase B, even failures are logged to
`/api/state` so the admin audit table shows what was attempted.

## Deployment notes (Render)

- **Service 1** (Node main): `npm install && npm run build && npm start`,
  port `$PORT` (Render-injected), Node 20 LTS.
- **Service 2** (Whisper): `pip install -r requirements-whisper.txt &&
  uvicorn server.whisper_service:app --host 0.0.0.0 --port $PORT`.
- **Service 3** (ECAPA): `pip install -r requirements-ecapa.txt &&
  uvicorn server.ecapa_service:app --host 0.0.0.0 --port $PORT`. First
  boot downloads the HuggingFace model (~22 MB) into `pretrained_models/`.

Environment variables on Service 1:
```
WHISPER_URL=https://voice-orb-whisper.onrender.com
ECAPA_URL=https://voice-orb-ecapa.onrender.com   # Phase B only
ADMIN_TOKEN=<random>                             # required for /admin
NODE_ENV=production
```

## Local dev (one machine)

```bash
# Terminal 1 — Whisper
cd server && python -m venv .venv-whisper && source .venv-whisper/bin/activate
pip install -r requirements-whisper.txt
uvicorn whisper_service:app --port 8001 --reload

# Terminal 2 — ECAPA (Phase B)
cd server && python -m venv .venv-ecapa && source .venv-ecapa/bin/activate
pip install -r requirements-ecapa.txt
uvicorn ecapa_service:app --port 8002 --reload

# Terminal 3 — Node
WHISPER_URL=http://localhost:8001 ECAPA_URL=http://localhost:8002 \
  ADMIN_TOKEN=dev-token node server.js

# Open http://localhost:3000
```

`scripts/dev.sh` automates all three with `concurrently`.

## Security posture (for the corporate demo)

- HTTPS-only enforced in production by `helmet` + Express middleware
  rejecting `req.protocol === 'http'` when `NODE_ENV === 'production'`.
- No PII stored. `/api/state` keeps a ring buffer of the **last 50** state
  events in memory only — wiped on restart, no disk persistence.
- No audio retained server-side. Both Python services process the
  uploaded chunk and immediately discard it; no file is written under
  `/tmp` past the request lifecycle.
- `/admin` requires `Authorization: Bearer $ADMIN_TOKEN` header. The token
  is rotated per presentation.
- `Content-Security-Policy` set by helmet allows: self, `fonts.gstatic.com`
  (Poppins), `fonts.googleapis.com` (Poppins CSS), and inline styles
  (the orb is a single file).
