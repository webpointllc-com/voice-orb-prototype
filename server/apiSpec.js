/**
 * Machine-readable plug-in contract for voice-orb lite.
 * GET /api/spec returns this + live runtime status.
 */

export const API_VERSION = '1';

export const REQUIREMENTS = [
  {
    id: 'https',
    label: 'HTTPS (or localhost)',
    required: true,
    for: 'Microphone + secure context',
  },
  {
    id: 'browser_stt',
    label: 'Web Speech API (Chrome / Safari)',
    required: true,
    for: 'Default STT — no server load',
  },
  {
    id: 'groq',
    label: 'GROQ_API_KEY',
    required: false,
    for: 'Server LLM + optional POST /api/transcribe fallback',
    env: 'GROQ_API_KEY',
  },
];

export const ENDPOINTS = [
  {
    id: 'spec',
    method: 'GET',
    path: '/api/spec',
    description: 'Requirements + open endpoint contracts (this document)',
    plug: 'Read-only',
  },
  {
    id: 'status',
    method: 'GET',
    path: '/api/status',
    description: 'Compact health + provider summary',
    plug: 'Read-only',
  },
  {
    id: 'chat',
    method: 'POST',
    path: '/api/chat',
    description: 'LLM reply stream',
    plug: 'Default: Groq. Override: PLUGIN_CHAT_URL (same SSE shape)',
    request: {
      contentType: 'application/json',
      body: { message: 'string (required)', sessionId: 'string (optional)' },
    },
    response: {
      contentType: 'text/event-stream',
      events: [
        'data: {"text":"chunk"}',
        'data: [DONE]',
        'data: {"error":"message"}',
      ],
    },
  },
  {
    id: 'transcribe',
    method: 'POST',
    path: '/api/transcribe',
    description: 'Server STT fallback (when browser has no Web Speech)',
    plug: 'Default: Groq Whisper. Override: PLUGIN_STT_URL — POST multipart field `audio`',
    request: {
      contentType: 'multipart/form-data',
      body: { audio: 'file (webm/opus)' },
    },
    response: {
      contentType: 'application/json',
      body: { text: 'string', source: 'string', ms: 'number' },
    },
  },
  {
    id: 'biometric',
    method: 'POST',
    path: '/api/biometric',
    description: 'Optional voice-session metrics snapshot',
    plug: 'Replace storage; keep JSON body passthrough',
    request: {
      contentType: 'application/json',
      body: {
        sessionId: 'string',
        rmsHistory: 'number[]',
        duration_ms: 'number',
      },
    },
    response: { contentType: 'application/json', body: { ok: true } },
  },
];

export function buildSpec(runtime) {
  const requirements = REQUIREMENTS.map((r) => {
    let status = 'n/a';
    if (r.id === 'https') status = runtime.https ? 'ok' : 'warn';
    if (r.id === 'browser_stt') status = 'client';
    if (r.id === 'groq') status = runtime.hasGroq ? 'ok' : 'missing';
    return { ...r, status };
  });

  const endpoints = ENDPOINTS.map((ep) => ({
    ...ep,
    url: runtime.baseUrl ? `${runtime.baseUrl}${ep.path}` : ep.path,
    active: runtime.activePlugins?.[ep.id] ?? 'built-in',
  }));

  return {
    version: API_VERSION,
    name: 'voice-orb-lite',
    mode: 'lite',
    requirements,
    endpoints,
    runtime: {
      llm: runtime.llm,
      stt: runtime.stt,
      services: 1,
      plugins: runtime.plugins,
    },
  };
}
