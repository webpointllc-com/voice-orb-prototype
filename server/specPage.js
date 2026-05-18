/** Minimal HTML requirements + endpoints view (no build step). */
export function renderSpecPage(spec) {
  const reqRows = spec.requirements
    .map(
      (r) =>
        `<tr><td><code>${r.id}</code></td><td>${r.label}</td><td>${r.required ? 'yes' : 'no'}</td><td><span class="s-${r.status}">${r.status}</span></td></tr>`
    )
    .join('');

  const epBlocks = spec.endpoints
    .map(
      (e) => `
      <article class="ep">
        <h3><span class="m">${e.method}</span> <code>${e.path}</code></h3>
        <p>${e.description}</p>
        <p class="plug"><strong>Plug-in:</strong> ${e.plug}</p>
        <p class="active"><strong>Active:</strong> ${e.active}</p>
      </article>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Voice Orb — API spec</title>
<style>
  :root { font-family: ui-sans-serif, system-ui, sans-serif; background: #0e0e10; color: #e8e8e5; }
  body { margin: 0; padding: 1.25rem; max-width: 52rem; line-height: 1.45; }
  h1 { font-size: 1.1rem; font-weight: 600; margin: 0 0 0.25rem; }
  .meta { color: #9a9a95; font-size: 0.8rem; margin-bottom: 1.25rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 1.5rem; }
  th, td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid #ffffff14; }
  th { color: #9a9a95; font-weight: 500; }
  .ep { border: 1px solid #ffffff18; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.65rem; }
  .ep h3 { margin: 0 0 0.35rem; font-size: 0.9rem; }
  .m { color: #6b9aff; font-size: 0.72rem; font-weight: 600; }
  .plug, .active { font-size: 0.78rem; color: #b8b8b2; margin: 0.2rem 0; }
  code { font-size: 0.85em; }
  a { color: #6b9aff; }
  .s-ok { color: #34d399; } .s-missing { color: #fbbf24; } .s-client { color: #9a9a95; }
</style>
</head>
<body>
  <h1>Voice Orb Lite — plug-in spec</h1>
  <p class="meta">v${spec.version} · JSON: <a href="/api/spec">/api/spec</a> · status: <a href="/api/status">/api/status</a></p>
  <h2>Requirements</h2>
  <table><thead><tr><th>ID</th><th>Item</th><th>Required</th><th>Status</th></tr></thead><tbody>${reqRows}</tbody></table>
  <h2>Open endpoints</h2>
  ${epBlocks}
</body>
</html>`;
}
