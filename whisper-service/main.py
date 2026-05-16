from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import uvicorn
from faster_whisper import WhisperModel
import os
import tempfile

app = FastAPI(title="Whisper Transcription Service")

# Load model once at startup (base.en is a good balance for free tier)
print("Loading Whisper model...")
model = WhisperModel("base.en", device="cpu", compute_type="int8")
print("Whisper model loaded successfully.")

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name

        # Transcribe
        segments, info = model.transcribe(tmp_path, language="en")
        text = " ".join([segment.text for segment in segments])

        # Cleanup
        os.unlink(tmp_path)

        return JSONResponse({
            "text": text.strip(),
            "language": info.language,
            "duration": info.duration
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/health")
def health():
    return {"status": "ok", "model": "base.en"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
