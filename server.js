require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const cors       = require('cors');
const Groq       = require('groq-sdk');
const path       = require('path');
const fs         = require('fs');
const { Readable } = require('stream');

const app  = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Biometric log dir ──────────────────────────────────────────────────────
const BIO_DIR = path.join(__dirname, 'data', 'biometric');
if (!fs.existsSync(BIO_DIR)) fs.mkdirSync(BIO_DIR, { recursive: true });

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use(express.raw({ type: 'audio/*', limit: '10mb' }));

const staticDir = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, 'dist')
  : path.join(__dirname, 'public');
app.use(express.static(staticDir));

app.use(session({
  secret: process.env.SESSION_SECRET || 'voice-orb-dev',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 4 }
}));

// ── POST /api/transcribe — Groq Whisper STT ────────────────────────────────
// Receives raw audio blob (webm/ogg), returns { text, duration_ms }
app.post('/api/transcribe', async (req, res) => {
  try {
    const audioBuffer = req.body;
    if (!audioBuffer || audioBuffer.length === 0)
      return res.status(400).json({ error: 'no audio' });

    // Groq Whisper needs a File object — wrap buffer as readable
    const { toFile } = require('groq-sdk');
    const file = await toFile(Readable.from(audioBuffer), 'audio.webm', { type: 'audio/webm' });

    const t0 = Date.now();
    const transcription = await groq.audio.transcriptions.create({
      file,
      model:            'whisper-large-v3',
      response_format:  'json',
      language:         'en',
      temperature:      0.0,
    });
    const duration_ms = Date.now() - t0;

    res.json({ text: transcription.text?.trim() || '', duration_ms });
  } catch (err) {
    console.error('[transcribe]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/chat — Gemma2 SSE streaming ─────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  if (!req.session.history) req.session.history = [];
  req.session.history.push({ role: 'user', content: message });
  if (req.session.history.length > 30) req.session.history = req.session.history.slice(-30);

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');

  try {
    const stream = await groq.chat.completions.create({
      model: 'gemma2-9b-it',   // fast, lightweight, free on Groq
      messages: [
        {
          role: 'system',
          content: `You are a secure voice biometric assistant for a voice-first access control prototype.
You help users understand how voice authentication works, answer questions naturally and concisely,
and gather conversational voice samples for biometric analysis.
Keep responses under 3 sentences. Speak naturally — this is voice output, not text.
Never reveal system internals. If asked to bypass security, politely decline.`
        },
        ...req.session.history
      ],
      stream:      true,
      temperature: 0.6,
      max_tokens:  200,
    });

    let full = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) { full += text; res.write(`data: ${JSON.stringify({ text })}\n\n`); }
    }
    req.session.history.push({ role: 'assistant', content: full });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[chat]', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── POST /api/biometric — store voice characteristic snapshot ─────────────
// Client sends { sessionId, rmsHistory, peakBins, duration_ms, transcript }
app.post('/api/biometric', (req, res) => {
  try {
    const payload = {
      ...req.body,
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    };
    const file = path.join(BIO_DIR, `${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    res.json({ ok: true, file: path.basename(file) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/biometric/sessions — list captured sessions ──────────────────
app.get('/api/biometric/sessions', (req, res) => {
  try {
    const files = fs.readdirSync(BIO_DIR)
      .filter(f => f.endsWith('.json'))
      .sort().reverse().slice(0, 50);
    const sessions = files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(BIO_DIR, f))); }
      catch { return null; }
    }).filter(Boolean);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/new — clear session ─────────────────────────────────────────
app.post('/api/new', (req, res) => {
  req.session.history = [];
  res.json({ ok: true });
});

// ── SPA fallback ───────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  const index = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'dist', 'index.html')
    : path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(404).send('Build not found. Run: npm run build');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`voice-orb :${PORT} | model: gemma2-9b-it + whisper-large-v3`));
