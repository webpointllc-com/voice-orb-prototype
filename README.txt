VOICE ORB PROTOTYPE (LITE + PLUG-IN SPEC)
=========================================

🔗 LIVE:  https://voice-orb-prototype.onrender.com
🎤 Click the mic button. Allow mic access. Say "My Voice Is My Password".

One Render service. Browser STT default. Open HTTP contract for final integration.

DISCOVERY
---------
  GET  /api/spec       JSON — requirements + endpoint schemas + runtime
  GET  /api/spec.html  Human-readable compact spec page
  GET  /api/status     Health summary
  GET  /api            → redirects to spec.html

OPEN ENDPOINTS (plug-in ready)
------------------------------
  POST /api/chat         { message, sessionId? } → SSE data: {"text":"..."} … [DONE]
  POST /api/transcribe   multipart audio → { text, source, ms }
  POST /api/biometric    { sessionId, rmsHistory, duration_ms } → { ok }

Server forward (no UI change):
  PLUGIN_CHAT_URL   — same body/SSE as /api/chat
  PLUGIN_STT_URL    — multipart field `audio`, JSON { text } back

Client forward (Vite env):
  VITE_CHAT_URL / VITE_TRANSCRIBE_URL / VITE_BIOMETRIC_URL

UI: bottom-left "API plug-in" panel loads /api/spec live.

REQUIREMENTS
------------
  Required: HTTPS, Web Speech (Chrome/Safari)
  Optional:  GROQ_API_KEY (server LLM + STT fallback)

DEPLOY
------
  render.yaml — single service, GROQ_API_KEY only required for live chat.

DEV
---
  npm run dev
  open http://localhost:5173  (orb) or http://localhost:3000/api/spec.html
