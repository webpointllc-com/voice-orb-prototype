"""
server/whisper_service.py
─────────────────────────
FastAPI bridge over faster-whisper for the voice-orb prototype.

Endpoints:
  POST /transcribe  multipart/form-data with `audio` file → {text, language}
  GET  /healthz                                            → {ok, model, ts}

Model: tiny.en (75 MB). For higher accuracy at the cost of cold-start time,
set WHISPER_MODEL=base.en or small.en via environment.

Why faster-whisper instead of openai-whisper:
- 4× faster on CPU
- Lower memory footprint
- Same model files (.en variants are English-only and smaller)
- MIT license
- Source: https://github.com/SYSTRAN/faster-whisper
"""

import os
import time
import tempfile
import logging
from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel

MODEL_NAME = os.environ.get("WHISPER_MODEL", "tiny.en")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")  # CPU-friendly
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("whisper")

app = FastAPI(title="voice-orb-whisper", version="0.2.0")

# Load model at startup. First call downloads the model from HuggingFace
# (~75 MB for tiny.en) into ~/.cache/huggingface/.
log.info("loading whisper model: %s (compute_type=%s, device=%s)", MODEL_NAME, COMPUTE_TYPE, DEVICE)
_t0 = time.time()
model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)
log.info("whisper model loaded in %.2fs", time.time() - _t0)


@app.get("/healthz")
def healthz():
    return {"ok": True, "model": MODEL_NAME, "ts": int(time.time() * 1000)}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if audio.content_type and not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail=f"expected audio/*, got {audio.content_type}")

    # faster-whisper takes a file path. Write the upload to a temp file.
    suffix = ".webm" if "webm" in (audio.content_type or "") else ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        t0 = time.time()
        segments, info = model.transcribe(
            tmp_path,
            beam_size=1,           # fast path for short utterances
            language="en",
            vad_filter=True,        # drop leading/trailing silence
            vad_parameters={"min_silence_duration_ms": 300},
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        elapsed = time.time() - t0
        log.info("transcribed in %.2fs: %r", elapsed, text)
        return {
            "text": text,
            "language": info.language,
            "duration_s": info.duration,
            "elapsed_s": round(elapsed, 3),
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8001)))
