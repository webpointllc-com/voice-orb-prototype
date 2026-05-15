# Claude Code Changelog
**Repo:** voice-orb-prototype

---

## 2026-05-15 — Repo initialized

**Set up by:** Claude Code

### What's here
- `server.js` — Express + Groq SSE streaming backend (complete, do not modify)
- `package.json` — dependencies: express, express-session, groq-sdk, cors, dotenv
- `.env.example` — env vars template
- `.gitignore`
- `claude-ops/GROK_HANDOFF.md` — full frontend build spec for Grok

### What Grok builds
Everything in `public/` — see GROK_HANDOFF.md

### What Claude Code will do after Grok submits
- Review shader/animation code
- Wire up any state machine gaps
- Add Render deploy config (`render.yaml`)
- Test full voice pipeline end to end
- Deploy to Render hobby tier

### Environment variables needed on Render
- `GROQ_API_KEY` — from console.groq.com
- `SESSION_SECRET` — any random string
