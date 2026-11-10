// The typewriter's sounds, made on the spot (Web Audio — no sound files): a key's clack (a short burst of filtered
// noise over a low thump, a little different each time), a softer one for backspace, and the carriage return (its
// ratchet, then the bell). Quiet by design; off when muted (kept on this device). The audio starts on the first key
// pressed — browsers allow sound only after you've done something on the page.

const MUTE = "cp-type-mute";
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

export const typeMuted = () => { try { return localStorage.getItem(MUTE) === "1"; } catch { return false; } };
export const setTypeMuted = (m: boolean) => { try { localStorage.setItem(MUTE, m ? "1" : "0"); } catch { /* this visit only */ } };

function audio(): AudioContext | null {
  if (typeMuted()) return null;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!noise) {
      noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.25), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  } catch { return null; }
}

/** a burst of noise through a band-pass: `f` its middle, `dur` long, `vol` loud, starting `at` (s from now) */
function burst(a: AudioContext, f: number, dur: number, vol: number, at = 0) {
  const t = a.currentTime + at, src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noise; bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 1.4;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  src.connect(bp).connect(g).connect(a.destination);
  src.start(t, Math.random() * 0.15, dur + 0.02);
}
/** a short low tone falling away (the key bottoming out, the type bar hitting the platen) */
function thump(a: AudioContext, f: number, dur: number, vol: number, at = 0) {
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = "triangle"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}

/** a key: clack */
export function typeKey() {
  const a = audio(); if (!a) return;
  const v = 0.85 + Math.random() * 0.3;
  burst(a, 2600 * v, 0.035, 0.32, 0);
  thump(a, 150 * v, 0.05, 0.22, 0.004);
  burst(a, 5200 * v, 0.018, 0.12, 0.012);
}
/** backspace: a lighter tick */
export function typeBack() {
  const a = audio(); if (!a) return;
  burst(a, 1800, 0.025, 0.16, 0);
  thump(a, 110, 0.04, 0.12, 0.003);
}
/** the carriage going back (a run of ratchet clicks), then the bell */
export function typeReturn() {
  const a = audio(); if (!a) return;
  for (let i = 0; i < 6; i++) burst(a, 3200 - i * 140, 0.014, 0.1, i * 0.028);
  thump(a, 90, 0.09, 0.2, 0.17);
  const t = a.currentTime + 0.2;
  for (const [f, vol] of [[2637, 0.16], [5274, 0.05]] as const) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0006, t + 0.9);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.95);
  }
}
