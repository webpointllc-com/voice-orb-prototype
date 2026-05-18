/**
 * Optional HTTP plug-ins — set env URLs to forward without changing the UI contract.
 */

export async function forwardChat(pluginUrl, body, res) {
  const upstream = await fetch(pluginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.text().catch(() => upstream.statusText);
    throw new Error(`plugin chat ${upstream.status}: ${err.slice(0, 200)}`);
  }

  const ct = upstream.headers.get('content-type') || '';
  if (ct.includes('text/event-stream') && upstream.body) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const reader = upstream.body.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(dec.decode(value, { stream: true }));
    }
    res.end();
    return;
  }

  const data = await upstream.json();
  const text = data.text ?? data.reply ?? data.message ?? '';
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.write(`data: ${JSON.stringify({ text })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}

export async function forwardStt(pluginUrl, buffer, filename = 'audio.webm') {
  const fd = new FormData();
  fd.append('audio', new Blob([buffer], { type: 'audio/webm' }), filename);

  const upstream = await fetch(pluginUrl, { method: 'POST', body: fd });
  if (!upstream.ok) {
    const err = await upstream.text().catch(() => upstream.statusText);
    throw new Error(`plugin stt ${upstream.status}: ${err.slice(0, 200)}`);
  }

  const data = await upstream.json();
  return {
    text: (data.text ?? data.transcript ?? '').trim(),
    source: data.source ?? 'plugin',
  };
}
