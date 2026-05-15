# DEPLOY.md - Voice Orb Prototype

## Services

| Service            | Purpose                  | Render Name          | Root Directory    |
|--------------------|--------------------------|----------------------|-------------------|
| Main App           | Frontend + Groq LLM      | voice-orb-prototype  | (root)            |
| Whisper Service    | Self-hosted Whisper STT  | whisper-service      | whisper-service/  |

---

## Auto-Deploy Setup (Recommended)

### Option 1: GitHub Actions (Best for Continuous Deployment)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [ main ]

jobs:
  deploy-main:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy Main App
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_MAIN }}"

  deploy-whisper:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy Whisper Service
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_WHISPER }}"
```

**Setup Steps:**
1. In each Render service → Settings → **Deploy Hook** → Create one
2. Add the two hooks as GitHub Secrets:
   - `RENDER_DEPLOY_HOOK_MAIN`
   - `RENDER_DEPLOY_HOOK_WHISPER`
3. Push to `main` → both services auto-deploy

### Option 2: Manual Deploy Hook (Simpler)

Just run this curl command after pushing:

```bash
# Main App
curl -X POST "https://api.render.com/deploy/srv-xxxxxx?key=xxxxx"

# Whisper Service
curl -X POST "https://api.render.com/deploy/srv-yyyyyy?key=yyyyy"
```

---

## Current Deployment Status (2026-05-15)

- [x] Main app scaffold pushed
- [x] Whisper service created (`whisper-service/`)
- [ ] Deploy Whisper service on Render (use `whisper-service/render.yaml`)
- [ ] Add `OPENAI_API_KEY` (if using OpenAI Whisper fallback)
- [ ] Wire main app to call Whisper service
- [ ] Test full voice loop

---

## Next Steps for Claude / Next Session

1. Deploy the `whisper-service` on Render using the included `render.yaml`
2. Copy the Whisper service URL
3. Update main `server.js` to call the Whisper service at `/api/transcribe`
4. Update frontend to use real audio recording + upload
5. Test end-to-end flow

**Note:** Render free tier will spin down both services. First request after idle may take 30-60s.