# STATE_FLOW — voice-orb state machine

The orb has 9 states. The renderer dispatches one of 4 visuals
(`ripple` / `bars` / `comet` / `mouth`). Every state owns its h1, sub,
colors, speed, amplitude, and visual key.

## State table (authoritative — matches `public/index.html` STATES const)

| Key | Pill | h1 | sub | L color | R color | viz |
|---|---|---|---|---|---|---|
| `IDLE` | Idle | Welcome to the RTT Platform | Your voice is your password | `[78,168,255]` | `[195,84,255]` | ripple |
| `LISTENING` | Listening | Welcome to the RTT Platform | Your voice is your password | `[78,200,230]` | `[195,84,255]` | ripple |
| `SPEAKING` | You speaking | I hear you | — | `[78,168,255]` | `[120,140,255]` | bars |
| `THINKING` | Thinking | — | — | `[210,210,255]` | `[210,210,255]` | comet |
| `RESPONDING` | AI responding | You passed | — | `[120,255,180]` | `[170,255,210]` | mouth |
| `FAILED` | Try again | Sorry, try again | That wasn't the phrase | `[255,140,90]` | `[255,90,120]` | mouth |
| `INTERRUPTED` | Interrupted | Go ahead | — | `[255,160,60]` | `[255,100,80]` | bars |
| `SIMULATE` | Simulating | Welcome to the RTT Platform | Your voice is your password | `[78,200,230]` | `[195,84,255]` | ripple |
| `ERROR` | Error | Something went wrong | Tap the mic to retry | `[239,68,68]` | `[239,68,68]` | ripple |

## Renderer dispatch

```
viz=ripple → drawRipple()   wings + bouncing Gaussian envelope (LISTENING/IDLE/SIMULATE/ERROR)
viz=bars   → drawBars()     vertical FFT bars per side       (SPEAKING/INTERRUPTED)
viz=comet  → drawComet()    bright head + 56 trail dots on ring (THINKING)
viz=mouth  → drawMouth()    central glow from orb center      (RESPONDING/FAILED)
```

## Transitions (the actual flow)

```
                ┌──────────────────┐
                │      IDLE        │   (mic off, ring quiet)
                └──────┬───────────┘
                       │ user clicks mic
                       ▼
                ┌──────────────────┐
       ┌────────│   LISTENING      │◄─────┐  (recog auto-restarts every session)
       │        └──────┬───────────┘      │
       │               │ user speaks       │
       │               ▼                   │
       │        ┌──────────────────┐      │
       │        │   (mid-recog)    │      │
       │        └──────┬───────────┘      │
       │               │                   │
       │      ┌────────┴────────┐          │
       │      │                 │          │
       │  phrase MATCH      speech, no    │
       │      │            match (final)   │
       │      ▼                 ▼          │
       │  ┌──────────┐     ┌──────────┐    │
       │  │ THINKING │     │ THINKING │    │
       │  │ (700ms)  │     │ (600ms)  │    │
       │  └────┬─────┘     └────┬─────┘    │
       │       ▼                ▼          │
       │  ┌──────────┐     ┌──────────┐    │
       │  │RESPONDING│     │  FAILED  │    │
       │  │"You pass"│     │"Try again│    │
       │  │ (2000ms) │     │ (2400ms) │    │
       │  └────┬─────┘     └────┬─────┘    │
       │       │                │          │
       │       └────────┬───────┘          │
       │                ▼                  │
       │           back to LISTENING ──────┘
       │
       │  user clicks mic OFF
       ▼
   ┌──────────────────┐
   │      IDLE        │
   └──────────────────┘
```

## Timing constants (in `public/index.html`)

```
COLOR_LERP_RATE         = 0.10   // 1 per frame; full color crossfade ~0.4s @ 60fps
ENTRANCE_DELAY_MS       = 200    // shimmer entrance start
ENTRANCE_DURATION_MS    = 900    // shimmer entrance duration
WING_REVEAL_DELAY_MS    = 400    // wings start emerging
WING_REVEAL_DURATION_MS = 600    // wings finish emerging
MIC_AUTOSTART_MS        = 780    // auto-request mic after entrance settles

THINKING_AFTER_MATCH_MS  = 700   // delay after match → THINKING
RESPONDING_HOLD_MS       = 2000  // RESPONDING glow duration before LISTENING
THINKING_AFTER_FAIL_MS   = 600   // delay after non-match → THINKING
FAILED_HOLD_MS           = 2400  // FAILED glow duration before LISTENING
```

## Audio thresholds (in `tickPromptActive` and `drawBars`)

```
PROMPT_ON     = 0.025   // RMS above this → letters pulse in wave
PROMPT_OFF    = 0.015   // RMS below this → letters return to 75% rest
PHRASE_MATCH  = 4 of 5  // "my voice is my password" → ≥4 of the 5 keywords
```

## The phrase gate

Exact rule (in `phraseMatch()`):
1. Normalize transcript to lowercase ASCII.
2. Strip punctuation.
3. Tokenize on whitespace.
4. Compare against `["my", "voice", "is", "my", "password"]` — match if at
   least 4 of the 5 expected tokens appear in order. Allows mild ASR drift.

Fuzz tolerance: "my voice my password" passes (4/5). "my password is voice"
fails (out of order). "the voice is the password" fails (2/5).

## Failure detection (from `recog.onresult` + `recog.onend`)

```
sessionGotSpeech = false  // did any non-empty transcript arrive?
sessionMatched   = false  // did phraseMatch() return true?

on each result chunk:
  if transcript.trim() != "":      sessionGotSpeech = true
  if phraseMatch(transcript):       onPhraseMatched()
  elif chunk.isFinal && got speech: onPhraseFailed()

on session end:
  if sessionGotSpeech && !sessionMatched && not in verdict state:
    onPhraseFailed()
```

`isVerdictState()` guards re-entry — once THINKING / RESPONDING / FAILED
is active, new recognition events are ignored until LISTENING resumes.

## What changes in Phase B (server-verified path)

Today the orb decides PASS/FAIL purely from Web Speech API's transcript.
In Phase B, after `THINKING` enters, the orb POSTs the last 2s of audio
to `/api/transcribe` and (optionally) `/api/verify`. Both must agree for
PASS. Either disagreement → FAILED. Adds ~300–800ms to verdict latency,
which is why `THINKING_AFTER_MATCH_MS` will likely need to grow to 1200.
