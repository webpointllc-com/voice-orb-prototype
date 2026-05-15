/**
 * callWhisper.js
 * Helper to call the separate Whisper service
 * Usage: const text = await callWhisper(audioBlob, WHISPER_SERVICE_URL);
 */
export async function callWhisper(audioBlob, whisperUrl) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');

  const response = await fetch(`${whisperUrl}/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Transcription failed');
  }

  const data = await response.json();
  return data.text;
}