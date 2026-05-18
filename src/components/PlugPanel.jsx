import { useState, useEffect } from 'react';
import { loadSpec } from '../lib/api';

function StatusDot({ status }) {
  const color =
    status === 'ok' ? 'bg-emerald-400' : status === 'missing' ? 'bg-amber-400' : 'bg-white/30';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

const PLUG_IDS = new Set(['chat', 'transcribe', 'biometric']);

export default function PlugPanel() {
  const [open, setOpen] = useState(false);
  const [spec, setSpec] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open || spec) return;
    loadSpec()
      .then(setSpec)
      .catch((e) => setErr(e.message));
  }, [open, spec]);

  const copy = (text) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  const plugEndpoints = spec?.endpoints?.filter((e) => PLUG_IDS.has(e.id)) ?? [];

  return (
    <div className="fixed bottom-4 left-4 z-50 font-mono text-[10px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-2.5 py-1 rounded-full border border-white/15 bg-black/70 backdrop-blur text-white/60 hover:text-white/90"
      >
        {open ? '✕ API' : 'API plug-in'}
      </button>

      {open && (
        <div className="mt-2 w-[min(100vw-2rem,22rem)] max-h-[70vh] overflow-auto rounded-lg border border-white/12 bg-black/85 backdrop-blur p-3 text-white/75 shadow-xl">
          {err && <p className="text-red-400/90 mb-2">{err}</p>}
          {!spec && !err && <p className="text-white/40">Loading /api/spec…</p>}

          {spec && (
            <>
              <p className="text-white/45 mb-2 leading-snug">
                v{spec.version} · {spec.runtime?.llm} ·{' '}
                <a href="/api/spec.html" target="_blank" rel="noreferrer" className="text-cyan-400/80 underline">
                  full spec
                </a>
              </p>

              <p className="text-[9px] uppercase tracking-widest text-white/35 mb-1">Requirements</p>
              <ul className="space-y-1 mb-3">
                {spec.requirements.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <StatusDot status={r.status} />
                    <span className={r.required ? 'text-white/70' : 'text-white/45'}>{r.label}</span>
                  </li>
                ))}
              </ul>

              <p className="text-[9px] uppercase tracking-widest text-white/35 mb-1">Open endpoints</p>
              <ul className="space-y-2">
                {plugEndpoints.map((e) => (
                  <li key={e.id} className="border border-white/8 rounded p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        <span className="text-cyan-400/90">{e.method}</span>{' '}
                        <code className="text-white/80">{e.path}</code>
                      </span>
                      <button
                        type="button"
                        onClick={() => copy(e.url || e.path)}
                        className="text-white/30 hover:text-white/60 shrink-0"
                        title="Copy URL"
                      >
                        copy
                      </button>
                    </div>
                    <p className="text-white/40 mt-1 leading-snug">{e.plug}</p>
                    <p className="text-white/25 mt-0.5">active: {e.active}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
