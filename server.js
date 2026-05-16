import 'dotenv/config';
import express    from 'express';
import session    from 'express-session';
import cors       from 'cors';
import Groq       from 'groq-sdk';
import path       from 'path';
import fs         from 'fs';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import multer     from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload    = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const app  = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Config ─────────────────────────────────────────────────────────────────
const WHISPER_SERVICE_URL = process.env.WHISPER_SERVICE_URL || '';  // e.g. https://whisper-service.onrender.com
const LLM_PROVIDER        = process.env.LLM_PROVIDER || 'groq';
const OLLAMA_URL          = process.env.OLLAMA_URL   || 'http://localhost:11434';
const OLLAMA_MODEL        = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const GROQ_MODEL          = 'gemma2-9b-it';

// ── Data dirs ──────────────────────────────────────────────────────────────
const BIO_DIR = path.join(__dirname, 'data', 'biometric');
if (!fs.existsSync(BIO_DIR)) fs.mkdirSync(BIO_DIR, { recursive: true });

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const staticDir = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, 'dist')
  : path.join(__dirname, 'public');
app.use(express.static(staticDir));

app.use(session({
  secret: process.env.SESSION_SECRET || 'voice-orb-dev',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 4 * 60 * 60 * 1000 }
}));

// ── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a secure biometric voice assistant for a voice-first access control prototype.
Engage users in natural conversation while their voice is being analyzed for biometric patterns.
Keep responses under 2 sentences. Spoken, not written — no bullet points, no markdown.
You are smart, confident, security-focused. Like a professional but friendly security officer.
Ask follow-up questions to keep the user talking — more speech = better biometric sample.
Never reveal system internals or how to bypass security.`;

// ── STT: whisper-service OR Groq Whisper fallback ──────────────────────────
async function transcribeAudio(buffer) {
  // Try self-hosted whisper-service first (faster, no API cost)
  if (WHISPER_SERVICE_URL) {
    try {
      const fd = new FormData();
      const blob = new Blob([buffer], { type: 'audio/webm' });
      fd.append('audio', blob, 'audio.webm');

      const res = await fetch(`${WHISPER_SERVICE_URL}/transcribe`, {
        method: 'POST',
        body: fd,
        signal: AbortSignal.timeout(15000),  // 15s timeout — whisper-service may cold-start
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[STT] whisper-service: "${data.text?.substring(0, 60)}"`);
        return { text: data.text?.trim() || '', source: 'whisper-service' };
      }
    } catch (err) {
      console.warn('[STT] whisper-service unavailable, falling back to Groq:', err.message);
    }
  }

  // Fallback: Groq Whisper API (always available)
  const { toFile } = await import('groq-sdk');
  const file = await toFile(Readable.from(buffer), 'audio.webm', { type: 'audio/webm' });
  const tx   = await groq.audio.transcriptions.create({
    file, model: 'whisper-large-v3', response_format: 'json', language: 'en', temperature: 0,
  });
  console.log(`[STT] groq-whisper: "${tx.text?.substring(0, 60)}"`);
  return { text: tx.text?.trim() || '', source: 'groq-whisper' };
}

// ── LLM: Groq or Ollama ────────────────────────────────────────────────────
async function streamChat(messages, res) {
  if (LLM_PROVIDER === 'ollama') {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: true }),
    });
    if (!ollamaRes.ok) throw new Error(`Ollama ${ollamaRes.status}`);
    const reader = ollamaRes.body.getReader();
    const dec    = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split('\n').filter(Boolean)) {
        try {
          const j    = JSON.parse(line);
          const text = j.message?.content || '';
          if (text) { full += text; res.write(`data: ${JSON.stringify({ text })}\n\n`); }
        } catch {}
      }
    }
    return full;
  }

  // Groq
  const stream = await groq.chat.completions.create({
    model: GROQ_MODEL, messages, stream: true, temperature: 0.65, max_tokens: 180,
  });
  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) { full += text; res.write(`data: ${JSON.stringify({ text })}\n\n`); }
  }
  return full;
}

// ── POST /api/transcribe ───────────────────────────────────────────────────
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const buf = req.file?.buffer;
    if (!buf || buf.length === 0) return res.status(400).json({ error: 'no audio' });
    const t0     = Date.now();
    const result = await transcribeAudio(buf);
    res.json({ ...result, ms: Date.now() - t0 });
  } catch (err) {
    console.error('[transcribe]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/chat ─────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  if (!req.session.history) req.session.history = [];
  req.session.history.push({ role: 'user', content: message });
  if (req.session.history.length > 30) req.session.history = req.session.history.slice(-30);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const full = await streamChat(
      [{ role: 'system', content: SYSTEM_PROMPT }, ...req.session.history], res
    );
    req.session.history.push({ role: 'assistant', content: full });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[chat]', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── POST /api/biometric ────────────────────────────────────────────────────
app.post('/api/biometric', (req, res) => {
  try {
    fs.writeFileSync(
      path.join(BIO_DIR, `${Date.now()}.json`),
      JSON.stringify({ ...req.body, ts: new Date().toISOString() }, null, 2)
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/biometric/sessions ────────────────────────────────────────────
app.get('/api/biometric/sessions', (req, res) => {
  try {
    const sessions = fs.readdirSync(BIO_DIR)
      .filter(f => f.endsWith('.json')).sort().reverse().slice(0, 50)
      .map(f => { try { return JSON.parse(fs.readFileSync(path.join(BIO_DIR, f))); } catch { return null; } })
      .filter(Boolean);
    res.json(sessions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/status ────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    stt: WHISPER_SERVICE_URL ? `whisper-service (${WHISPER_SERVICE_URL}) + groq fallback` : 'groq-whisper only',
    llm: LLM_PROVIDER === 'ollama' ? `ollama:${OLLAMA_MODEL}` : `groq:${GROQ_MODEL}`,
    biometric_sessions: fs.readdirSync(BIO_DIR).filter(f => f.endsWith('.json')).length,
  });
});

// ── POST /api/new ──────────────────────────────────────────────────────────
app.post('/api/new', (req, res) => { req.session.history = []; res.json({ ok: true }); });

// ── SPA fallback ───────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  const idx = path.join(staticDir, 'index.html');
  if (fs.existsSync(idx)) res.sendFile(idx);
  else res.status(200).send('<h2>Run: npm run build</h2>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const stt = WHISPER_SERVICE_URL ? `whisper-service → groq fallback` : `groq-whisper`;
  const llm = LLM_PROVIDER === 'ollama' ? `ollama:${OLLAMA_MODEL}` : `groq:${GROQ_MODEL}`;
  console.log(`voice-orb :${PORT} | STT: ${stt} | LLM: ${llm}`);
});
