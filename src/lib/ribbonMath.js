/**
 * ribbonMath.js — Voice Orb Waveform Wing Renderer
 * Proven implementation. Wire it up, do not rewrite.
 * Test: drawRibbons(ctx, new Float32Array(64).fill(0.3), 0.2, 0, 'LISTENING', 800, 600)
 */
import { STATE_AMP_MULT } from './stateMachine.js';

const STATE_RIBBON_COLORS = {
  IDLE:        ['rgba(85,85,85,',    'rgba(85,85,85,'],
  LISTENING:   ['rgba(0,212,255,',   'rgba(107,99,255,'],
  SPEAKING:    ['rgba(79,139,255,',  'rgba(107,99,255,'],
  THINKING:    ['rgba(155,123,255,', 'rgba(107,99,255,'],
  RESPONDING:  ['rgba(233,30,140,',  'rgba(255,107,157,'],
  INTERRUPTED: ['rgba(255,107,157,', 'rgba(255,107,157,'],
  ERROR:       ['rgba(239,68,68,',   'rgba(239,68,68,'],
};

const STATE_OPACITY = {
  IDLE: 0.25, LISTENING: 0.72, SPEAKING: 0.88,
  THINKING: 0.45, RESPONDING: 0.85, INTERRUPTED: 0.6, ERROR: 0.4,
};

export function drawRibbons(ctx, smoothed, rmsSmoothed, phase, state, W, H) {
  ctx.clearRect(0, 0, W, H);
  const CY = H / 2;
  const PTS = 90;
  const ampMult = STATE_AMP_MULT[state] ?? 0.5;
  const [cA, cB] = STATE_RIBBON_COLORS[state] ?? STATE_RIBBON_COLORS.LISTENING;
  const maxOp = STATE_OPACITY[state] ?? 0.72;

  const ptsA = [], ptsB = [];

  for (let i = 0; i <= PTS; i++) {
    const t = i / PTS;
    const x = t * W;
    const env = Math.sin(t * Math.PI); // THE ENVELOPE — do not touch
    const bin = Math.min(63, Math.floor(t * 60));
    const mag = ((smoothed[bin] ?? 0) + 0.04) * ampMult;

    ptsA.push({ x, y: CY
      + Math.sin(t * Math.PI * 2.0 + phase * 1.20)       * 22 * env * (0.30 + mag * 1.65)
      + Math.sin(t * Math.PI * 4.3 + phase * 0.70 + 0.9) *  9 * env * (0.20 + mag * 0.90) });

    ptsB.push({ x, y: CY
      + Math.sin(t * Math.PI * 2.4 + phase * 0.90 + 1.2) * 24 * env * (0.30 + mag * 1.45)
      + Math.sin(t * Math.PI * 3.8 + phase * 1.40 + 2.1) *  8 * env * (0.18 + mag * 0.80) });
  }

  function buildPath(pts, flatH) {
    const p = new Path2D();
    p.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      if (i < pts.length - 1) {
        const mx = (pts[i].x + pts[i+1].x) / 2;
        const my = (pts[i].y + pts[i+1].y) / 2;
        p.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      } else { p.lineTo(pts[i].x, pts[i].y); }
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const env = Math.sin((i / PTS) * Math.PI);
      p.lineTo(pts[i].x, CY + flatH * env);
    }
    p.closePath();
    return p;
  }

  function makeGrad(c, op) {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0,    c + '0)');
    g.addColorStop(0.15, c + (op * 0.4).toFixed(2) + ')');
    g.addColorStop(0.5,  c + op.toFixed(2) + ')');
    g.addColorStop(0.85, c + (op * 0.4).toFixed(2) + ')');
    g.addColorStop(1,    c + '0)');
    return g;
  }

  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = makeGrad(cB, maxOp * 0.82);
  ctx.fill(buildPath(ptsB, 7));
  ctx.fillStyle = makeGrad(cA, maxOp);
  ctx.fill(buildPath(ptsA, 5));
  ctx.globalCompositeOperation = 'source-over';

  // Baseline
  ctx.beginPath();
  ctx.moveTo(0, CY); ctx.lineTo(W, CY);
  ctx.strokeStyle = cA + '0.10)';
  ctx.lineWidth = 1;
  if (state === 'THINKING') ctx.setLineDash([4, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  if (state !== 'IDLE' && state !== 'INTERRUPTED') drawDiamonds(ctx, ptsA, cA, maxOp, CY);
}

function drawDiamonds(ctx, pts, color, opacity, CY) {
  let count = 0;
  for (let i = 2; i < pts.length - 2; i++) {
    if (count >= 12) break;
    const prev = pts[i-1].y, curr = pts[i].y, next = pts[i+1].y;
    const peakAbove = curr < prev && curr < next && curr < CY - 4;
    const peakBelow = curr > prev && curr > next && curr > CY + 4;
    if (!peakAbove && !peakBelow) continue;
    const dist = Math.abs(curr - CY);
    const size = Math.max(2, Math.min(7, 2 + dist * 0.18));
    const alpha = Math.min(opacity, 0.5 + dist * 0.018);
    ctx.save();
    ctx.translate(pts[i].x, pts[i].y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color + alpha.toFixed(2) + ')';
    ctx.fillRect(-size/2, -size/2, size, size);
    ctx.restore();
    count++;
    i += 3;
  }
}

export function updateSmoothed(smoothed, freqData) {
  const len = Math.min(smoothed.length, freqData.length);
  for (let i = 0; i < len; i++) {
    const target = (freqData[i] ?? 0) / 255;
    const cur = smoothed[i];
    smoothed[i] = cur + (target - cur) * (target > cur ? 0.45 : 0.12);
  }
}

export function calcRMS(timeDomainData) {
  let sum = 0;
  for (let i = 0; i < timeDomainData.length; i++) {
    const v = (timeDomainData[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / timeDomainData.length);
}

/**
 * drawThinkingMini — Orbiting dotted circles + center glow for THINKING state card
 * (Separate from ribbon wings per Claude spec)
 */
export function drawThinkingMini(ctx, phase, W, H) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;

  // 3 concentric dotted circles, rotating in opposite directions
  [20, 34, 48].forEach((r, ri) => {
    const dots = 12 + ri * 4;
    for (let i = 0; i < dots; i++) {
      const angle = (i / dots) * Math.PI * 2 + phase * (ri % 2 === 0 ? 1 : -0.7);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const op = 0.25 + 0.45 * Math.abs(Math.sin(angle + phase));
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(155,123,255,${op.toFixed(2)})`;
      ctx.fill();
    }
  });

  // Center glow
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
  g.addColorStop(0, 'rgba(185,103,255,1)');
  g.addColorStop(1, 'rgba(185,103,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
}