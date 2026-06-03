/**
 * Tiny procedural sound engine built on the Web Audio API — no audio assets to
 * ship. Each cue is a short blip/arpeggio. Respects the user's sound setting
 * (passed in by the caller) and lazily creates the AudioContext on first use
 * so we don't trip browser autoplay policies.
 */
type Cue =
  | "complete"
  | "undo"
  | "coin"
  | "levelup"
  | "evolve"
  | "pet"
  | "buy"
  | "quest"
  | "error"
  | "chest"
  | "gacha"
  | "combo"
  | "catch"
  | "gameover"
  | "blip1"
  | "blip2"
  | "blip3"
  | "blip4";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(freq: number, start: number, dur: number, type: OscillatorType, gain: number): void {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

const CUES: Record<Cue, () => void> = {
  complete: () => { blip(660, 0, 0.12, "triangle", 0.18); blip(990, 0.08, 0.14, "triangle", 0.16); },
  undo: () => { blip(440, 0, 0.12, "sine", 0.12); blip(330, 0.07, 0.14, "sine", 0.1); },
  coin: () => { blip(1320, 0, 0.08, "square", 0.08); blip(1760, 0.05, 0.1, "square", 0.07); },
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => blip(f, i * 0.09, 0.16, "triangle", 0.16)),
  evolve: () => [392, 523, 659, 784, 1047].forEach((f, i) => blip(f, i * 0.1, 0.22, "sawtooth", 0.12)),
  pet: () => { blip(880, 0, 0.1, "sine", 0.12); blip(1180, 0.06, 0.12, "sine", 0.1); },
  buy: () => { blip(740, 0, 0.1, "triangle", 0.14); blip(1110, 0.07, 0.12, "triangle", 0.12); },
  quest: () => [659, 880, 1320].forEach((f, i) => blip(f, i * 0.08, 0.16, "triangle", 0.14)),
  error: () => { blip(200, 0, 0.16, "sawtooth", 0.1); },
  chest: () => [523, 659, 784, 1047, 1319].forEach((f, i) => blip(f, i * 0.07, 0.18, "triangle", 0.15)),
  gacha: () => [392, 587, 784, 1175].forEach((f, i) => blip(f, i * 0.11, 0.2, "triangle", 0.14)),
  combo: () => { blip(880, 0, 0.07, "square", 0.1); blip(1320, 0.05, 0.09, "square", 0.09); },
  catch: () => { blip(1046, 0, 0.06, "triangle", 0.1); blip(1318, 0.04, 0.07, "triangle", 0.08); },
  gameover: () => [440, 349, 262].forEach((f, i) => blip(f, i * 0.12, 0.2, "sawtooth", 0.12)),
  // Simon-style pads (Pet Says).
  blip1: () => blip(392, 0, 0.32, "sine", 0.16),
  blip2: () => blip(523, 0, 0.32, "sine", 0.16),
  blip3: () => blip(659, 0, 0.32, "sine", 0.16),
  blip4: () => blip(784, 0, 0.32, "sine", 0.16),
};

export function play(cue: Cue, enabled: boolean): void {
  if (!enabled) return;
  try {
    CUES[cue]();
  } catch {
    /* audio not available — silently ignore */
  }
}
