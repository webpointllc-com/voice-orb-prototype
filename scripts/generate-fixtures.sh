#!/usr/bin/env bash
# scripts/generate-fixtures.sh
# ─────────────────────────────
# Produce the three WAV fixtures Playwright needs:
#   tests/fixtures/pass.wav    — "my voice is my password"
#   tests/fixtures/fail.wav    — "hello there how are you"
#   tests/fixtures/silence.wav — 3 seconds of silence
#
# Output format: 16 kHz mono PCM (Chrome's --use-file-for-fake-audio-capture
# hangs on anything else).
#
# Uses macOS `say` if available; falls back to `espeak-ng` on Linux. Both
# pipe through `ffmpeg` for resampling to 16k mono PCM.
#
# Requirements:
#   - ffmpeg (brew install ffmpeg / apt install ffmpeg)
#   - say (macOS built-in) OR espeak-ng (apt install espeak-ng / brew install espeak)

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$HERE/../tests/fixtures"
mkdir -p "$OUT_DIR"

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "missing dependency: $1"; exit 1; }
}

require ffmpeg

# ── Pick a TTS engine ─────────────────────────────────────────────────
TTS_ENGINE=""
if command -v say >/dev/null 2>&1; then
  TTS_ENGINE="say"
elif command -v espeak-ng >/dev/null 2>&1; then
  TTS_ENGINE="espeak-ng"
elif command -v espeak >/dev/null 2>&1; then
  TTS_ENGINE="espeak"
else
  echo "ERROR: need 'say' (macOS) or 'espeak-ng' / 'espeak' (Linux) for TTS."
  echo "  macOS: built-in, nothing to install"
  echo "  Debian/Ubuntu: sudo apt install espeak-ng"
  echo "  Fedora: sudo dnf install espeak-ng"
  exit 1
fi
echo "[fixtures] using TTS: $TTS_ENGINE"

# ── Helper: speak text, resample to 16kHz mono PCM WAV ────────────────
make_wav() {
  local text="$1"
  local out="$2"
  local tmp
  tmp="$(mktemp -d)/raw.aiff"

  case "$TTS_ENGINE" in
    say)
      say -v "Samantha" --output-file="$tmp" --data-format=LEF32@22050 "$text"
      ;;
    espeak-ng|espeak)
      tmp="${tmp%.aiff}.wav"
      "$TTS_ENGINE" -s 150 -v en-us -w "$tmp" "$text"
      ;;
  esac

  ffmpeg -y -hide_banner -loglevel error -i "$tmp" \
    -ar 16000 -ac 1 -acodec pcm_s16le "$out"
  rm -f "$tmp"
  echo "[fixtures] wrote $out"
}

# ── Pass / fail phrases ───────────────────────────────────────────────
make_wav "my voice is my password" "$OUT_DIR/pass.wav"
make_wav "hello there how are you today" "$OUT_DIR/fail.wav"

# ── Silence ───────────────────────────────────────────────────────────
ffmpeg -y -hide_banner -loglevel error -f lavfi -i anullsrc=r=16000:cl=mono \
  -t 3 -ar 16000 -ac 1 -acodec pcm_s16le "$OUT_DIR/silence.wav"
echo "[fixtures] wrote $OUT_DIR/silence.wav"

# ── Verify ────────────────────────────────────────────────────────────
echo
echo "[fixtures] verifying format (must be 16000 Hz, 1 channel, pcm_s16le):"
for f in pass.wav fail.wav silence.wav; do
  ffprobe -hide_banner -v error -select_streams a:0 \
    -show_entries stream=codec_name,sample_rate,channels,duration \
    -of default=noprint_wrappers=1 "$OUT_DIR/$f" | sed "s|^|  $f: |"
done

echo
echo "[fixtures] done. Run: npm test"
