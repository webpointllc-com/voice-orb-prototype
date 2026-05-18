# Audio fixtures

Binary WAV files **not committed** to git. Regenerate locally:

```bash
bash scripts/generate-fixtures.sh
```

Produces:

- `pass.wav` — "my voice is my password" (TTS-synthesized)
- `fail.wav` — "hello there how are you today" (TTS-synthesized)
- `silence.wav` — 3 seconds of silence (ffmpeg lavfi)

All three are **16 kHz mono PCM**. Chrome's
`--use-file-for-fake-audio-capture` flag hangs on stereo or non-PCM input.

Verify after generating:

```bash
ffprobe -hide_banner tests/fixtures/pass.wav
# Expected: codec_name=pcm_s16le, sample_rate=16000, channels=1
```

## Why TTS instead of real recordings

Phase A tests verify **the state machine and DOM behavior**, not voice
biometric accuracy. TTS audio is deterministic, reproducible across
machines, and good enough to drive Web Speech API to recognize the
passphrase ~95% of the time on Chrome desktop.

For Phase B testing (ECAPA-TDNN biometric path), real recordings of the
enrolled speaker are required. Those go in `tests/fixtures/speakers/<id>/`
and are also gitignored (PII).

## Drew's own enrollment recording

For the live presentation, Drew will record his own passphrase via the
orb's enrollment flow (Phase B, not yet built). That WAV lives on the
Render disk for the ECAPA service and is **never committed**.
