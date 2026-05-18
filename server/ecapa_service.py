"""
server/ecapa_service.py
───────────────────────
FastAPI bridge over SpeechBrain's ECAPA-TDNN model for speaker
verification. Phase B of the voice-orb prototype.

Endpoints:
  POST /enroll  multipart with `audio` + `user_id` → stores reference embedding
  POST /verify  multipart with `audio` + `user_id` → {score, same_speaker}
  GET  /healthz                                    → {ok, model, ts}

Model: speechbrain/spkrec-ecapa-voxceleb from HuggingFace. ~22 MB.
Auto-downloads on first SpeakerRecognition.from_hparams call.

Reference implementation matches the SpeechBrain documented usage:
https://speechbrain.readthedocs.io/en/latest/tutorials/advanced/pre-trained-models-and-fine-tuning-with-huggingface.html

For the corporate demo, "enrollment" is a one-time recording of the
operator (Drew) saying the passphrase. The embedding is cached on disk
and compared against every subsequent verify request. Threshold uses
SpeechBrain's built-in Equal Error Rate point (decision returned as
`prediction` boolean alongside the raw cosine score).
"""

import os
import time
import tempfile
import logging
import json
from pathlib import Path
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from speechbrain.inference.speaker import SpeakerRecognition

MODEL_SOURCE = "speechbrain/spkrec-ecapa-voxceleb"
MODEL_DIR = os.environ.get("ECAPA_MODEL_DIR", "pretrained_models/spkrec-ecapa-voxceleb")
ENROLLMENT_DIR = Path(os.environ.get("ECAPA_ENROLLMENT_DIR", "enrollments"))
ENROLLMENT_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ecapa")

app = FastAPI(title="voice-orb-ecapa", version="0.2.0")

log.info("loading ECAPA-TDNN model: %s", MODEL_SOURCE)
_t0 = time.time()
verifier = SpeakerRecognition.from_hparams(source=MODEL_SOURCE, savedir=MODEL_DIR)
log.info("ECAPA-TDNN loaded in %.2fs", time.time() - _t0)


def _user_path(user_id: str) -> Path:
    safe = "".join(c for c in user_id if c.isalnum() or c in "-_")[:64]
    if not safe:
        raise HTTPException(status_code=400, detail="invalid user_id")
    return ENROLLMENT_DIR / f"{safe}.wav"


@app.get("/healthz")
def healthz():
    return {"ok": True, "model": MODEL_SOURCE, "ts": int(time.time() * 1000)}


@app.post("/enroll")
async def enroll(audio: UploadFile = File(...), user_id: str = Form(...)):
    """Store the audio file as the reference for this user_id."""
    dest = _user_path(user_id)
    with dest.open("wb") as fh:
        fh.write(await audio.read())
    log.info("enrolled %s → %s (%d bytes)", user_id, dest, dest.stat().st_size)
    return {"ok": True, "user_id": user_id, "path": str(dest)}


@app.post("/verify")
async def verify(audio: UploadFile = File(...), user_id: str = Form(...)):
    """Compare the audio file against the enrolled reference for user_id."""
    ref = _user_path(user_id)
    if not ref.exists():
        raise HTTPException(status_code=404, detail=f"no enrollment for {user_id}")

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        t0 = time.time()
        # verify_files returns (cosine_score: Tensor, prediction: Tensor[bool])
        score_tensor, pred_tensor = verifier.verify_files(str(ref), tmp_path)
        score = float(score_tensor.item())
        same_speaker = bool(pred_tensor.item())
        elapsed = time.time() - t0
        log.info("verify %s: score=%.4f same=%s in %.2fs", user_id, score, same_speaker, elapsed)
        return {
            "score": round(score, 4),
            "same_speaker": same_speaker,
            "elapsed_s": round(elapsed, 3),
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8002)))
