require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const Groq = require('groq-sdk');
const path = require('path');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'voice-orb-dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 }
}));

// POST /api/chat — SSE streaming response
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  if (!req.session.history) req.session.history = [];
  req.session.history.push({ role: 'user', content: message });
  if (req.session.history.length > 20) req.session.history = req.session.history.slice(-20);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a helpful, concise voice assistant. Keep responses short and natural — spoken, not written.' },
        ...req.session.history
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 300
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    req.session.history.push({ role: 'assistant', content: fullResponse });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// POST /api/new — clear session
app.post('/api/new', (req, res) => {
  req.session.history = [];
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`voice-orb running on :${PORT}`));
