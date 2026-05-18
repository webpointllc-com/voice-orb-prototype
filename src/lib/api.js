/**
 * Client plug-in resolver — paths from /api/spec, overridable via Vite env.
 */

let _spec = null;

export async function loadSpec() {
  const res = await fetch('/api/spec');
  if (!res.ok) throw new Error(`spec ${res.status}`);
  _spec = await res.json();
  return _spec;
}

export function getSpec() {
  return _spec;
}

export function endpointPath(id) {
  const envKey = `VITE_${id.toUpperCase()}_URL`;
  const fromEnv = import.meta.env[envKey];
  if (fromEnv) return fromEnv;
  const ep = _spec?.endpoints?.find((e) => e.id === id);
  return ep?.path ?? `/api/${id}`;
}

/** Parse SSE chat stream; calls onChunk(text) per token. */
export async function streamChat(message, { sessionId, onChunk } = {}) {
  const res = await fetch(endpointPath('chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `chat ${res.status}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = dec.decode(value, { stream: true }).split('\n').filter((l) => l.startsWith('data:'));
    for (const line of lines) {
      const d = line.slice(5).trim();
      if (d === '[DONE]') return full;
      try {
        const parsed = JSON.parse(d);
        if (parsed.error) throw new Error(parsed.error);
        const chunk =
          parsed.text ?? parsed.content ?? parsed.choices?.[0]?.delta?.content ?? '';
        if (chunk) {
          full += chunk;
          onChunk?.(full, chunk);
        }
      } catch (e) {
        if (e.message && !e.message.includes('JSON')) throw e;
      }
    }
  }
  return full;
}

export async function postBiometric(payload) {
  return fetch(endpointPath('biometric'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function postTranscribe(formData) {
  return fetch(endpointPath('transcribe'), { method: 'POST', body: formData });
}
