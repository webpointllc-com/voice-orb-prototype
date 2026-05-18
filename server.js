// server.js — voice-orb main server
// Serves public/index.html, logs /api/state, proxies ASR + biometric,
// provides Groq fallback for chat + transcription, exposes /admin.
'use strict';

require('dotenv/config');
const express  = require('express');
const helmet   = require('helmet');
const compress = require('compression');
const morgan   = require('morgan');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT        = process.env.PORT        || 3000;
const NODE_ENV    = process.env.NODE_ENV    || 'development';
const WHISPER_URL = (process.env.WHISPER_URL || '').trim();
const ECAPA_URL   = (process.env.ECAPA_URL   || '').trim();
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();
const GROQ_KEY    = (process.env.GROQ_API_KEY || '').trim();
const VOICE_ACCESS_URL = (process.env.VOICE_ACCESS_URL || '').trim();
const GROQ_MODEL  = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

const HAS_GROQ = Boolean(GROQ_KEY);
let groq = null;
if (HAS_GROQ) {
  const Groq = require('groq-sdk');
  groq = new Groq({ apiKey: GROQ_KEY });
}

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// ── Security ─────────────────────────────────────────────────────────────
// CSP notes:
//  - public/index.html is a single inline-script SPA, so scriptSrc MUST
//    include 'unsafe-inline' or the page is blank in production.
//  - VOICE_ACCESS_URL is an external Render service iframe-warmed via
//    /healthz and may be fetched directly in the future, so it has to be
//    allowed in frameSrc and connectSrc. We add the configured origin if
//    we can parse it; otherwise we fall back to 'https:' so deploys don't
//    break when the env var is set later.
const VOICE_ACCESS_ORIGIN = (() => {
  try { return VOICE_ACCESS_URL ? new URL(VOICE_ACCESS_URL).origin : null; }
  catch { return null; }
})();
const extraConnect = VOICE_ACCESS_ORIGIN ? [VOICE_ACCESS_ORIGIN] : ['https:'];
const extraFrame   = VOICE_ACCESS_ORIGIN ? [VOICE_ACCESS_ORIGIN] : ['https:'];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com', 'data:'],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'", ...extraConnect],
      frameSrc:    ["'self'", ...extraFrame],
      workerSrc:   ["'self'", 'blob:'],
      mediaSrc:    ["'self'", 'blob:'],
    },
  },
  // Render terminates TLS upstream — turning HSTS on at the app layer is
  // fine, but crossOriginEmbedderPolicy blocks the Google Fonts stylesheet
  // and breaks getUserMedia popups in some browsers. Leave it off.
  crossOriginEmbedderPolicy: false,
}));

// HTTPS-only in production — getUserMedia requires secure context
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'https') return next();
    res.redirect(308, `https://${req.headers.host}${req.url}`);
  });
}

app.use(compress());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50kb' }));

// ── /api/state — 50-entry ring buffer, POSTed on every state transition ──
const stateLog = [];
app.post('/api/state', (req, res) => {
  stateLog.push({
    t:     Date.now(),
    state: String(req.body?.state || 'UNKNOWN').slice(0, 40),
    ua:    String(req.headers['user-agent'] || '').slice(0, 120),
    ip:    req.ip,
  });
  if (stateLog.length > 50) stateLog.shift();
  res.status(204).end();
});

// ── /healthz ──────────────────────────────────────────────────────────────
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), env: NODE_ENV });
});

// ── /admin — last 50 state events, Bearer token-gated ────────────────────
app.get('/admin', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  res.json({ entries: stateLog });
});

// ── /api/transcribe — proxy to Whisper service, Groq fallback ────────────
if (WHISPER_URL) {
  app.use('/api/transcribe', createProxyMiddleware({
    target:      WHISPER_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/transcribe': '/transcribe' },
    timeout:     30_000,
  }));
} else {
  app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    if (!HAS_GROQ) return res.status(503).json({ error: 'no STT provider — set GROQ_API_KEY or WHISPER_URL' });
    try {
      const { toFile } = require('groq-sdk');
      const { Readable } = require('stream');
      const buf  = req.file?.buffer;
      if (!buf?.length) return res.status(400).json({ error: 'no audio' });
      const file = await toFile(Readable.from(buf), 'audio.webm', { type: 'audio/webm' });
      const tx   = await groq.audio.transcriptions.create({
        file, model: 'whisper-large-v3', response_format: 'json', language: 'en', temperature: 0,
      });
      res.json({ text: tx.text?.trim() || '', source: 'groq-whisper' });
    } catch (err) {
      console.error('[transcribe]', err.message);
      res.status(500).json({ error: err.message });
    }
  });
}

// ── /api/verify — proxy to ECAPA service, stub if not set ────────────────
if (ECAPA_URL) {
  app.use('/api/verify', createProxyMiddleware({
    target:      ECAPA_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/verify': '/verify' },
    timeout:     30_000,
  }));
} else {
  app.post('/api/verify', (_req, res) => {
    // Stub: hardcoded 0.85 score. Replace when ECAPA enrollment exists.
    res.json({ score: 0.85, same_speaker: true, source: 'stub' });
  });
}

// ── /api/chat — Groq LLM streaming ───────────────────────────────────────
const SYSTEM_PROMPT = `You are a voice security assistant in a prototype demo.
Reply in one or two short spoken sentences. No markdown, lists, or emojis.
Stay friendly and security-themed. Never explain how to bypass systems.`;

app.post('/api/chat', async (req, res) => {
  const msg = String(req.body?.message || '').trim().slice(0, 2000);
  if (!msg) return res.status(400).json({ error: 'message required' });
  if (!HAS_GROQ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ text: 'Demo mode — set GROQ_API_KEY for live responses.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: msg }],
      stream: true, temperature: 0.6, max_tokens: 96,
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[chat]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); }
  }
});

// ── Static — public/index.html with VOICE_ACCESS_URL injected ────────────
const PUBLIC = path.join(__dirname, 'public');
app.use(express.static(PUBLIC, {
  index: false, // we serve index.html manually so we can inject the URL
  setHeaders(res, p) {
    if (!p.endsWith('index.html')) res.setHeader('Cache-Control', 'public, max-age=86400');
  },
}));

const INDEX = path.join(PUBLIC, 'index.html');
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'unknown route' });
  }
  if (!fs.existsSync(INDEX)) {
    return res.status(500).send('<h2>public/index.html missing</h2>');
  }
  const html = fs.readFileSync(INDEX, 'utf8')
    .replace('content=""', `content="${VOICE_ACCESS_URL}"`)  // <meta name="voice-access-url">
    .replace('__VOICE_ACCESS_URL__', VOICE_ACCESS_URL);       // JS placeholder fallback
  res.setHeader('Cache-Control', 'no-cache');
  res.type('html').send(html);
});

app.listen(PORT, () => {
  console.log(`[voice-orb] :${PORT} (${NODE_ENV})`);
  console.log(`[voice-orb] groq=${HAS_GROQ} whisper=${WHISPER_URL || 'groq-fallback'} ecapa=${ECAPA_URL || 'stub'}`);
});
