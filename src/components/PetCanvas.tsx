/**
 * The procedurally-drawn pet. Everything here is generated from primitives on a
 * 2D canvas — no sprite assets — so the creature can smoothly reflect its
 * evolution stage, mood, equipped cosmetics and live reactions.
 *
 * Drawing happens in a fixed 320×320 logical space; the canvas element is sized
 * responsively by CSS and the backing store is scaled for crisp HiDPI output.
 */
import { useEffect, useRef } from "react";
import { SPECIES } from "../game/constants";
import type { EquippedCosmetics, EvolutionStage, Mood, PetSpecies } from "../game/types";

const LOGICAL = 320;

interface Props {
  stage: EvolutionStage;
  mood: Mood;
  species: PetSpecies;
  equipped: EquippedCosmetics;
  /** 0–1 overall vitality, used to subtly desaturate a neglected pet. */
  vitality: number;
  reducedMotion: boolean;
  /** Increment to spawn a burst of hearts (a pet/affection reaction). */
  heartPulse: number;
  /** Increment to spawn celebratory sparkles (level up / evolve). */
  sparklePulse: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: "heart" | "sparkle";
  hue: number;
  size: number;
}

// ───────────────────────────────────────────────────────────── color helpers

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(hex: string, target: [number, number, number], t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (a: number, c: number) => Math.round(a + (c - a) * t);
  return `rgb(${m(r, target[0])},${m(g, target[1])},${m(b, target[2])})`;
}
const lighten = (hex: string, t: number) => mix(hex, [255, 255, 255], t);
const darken = (hex: string, t: number) => mix(hex, [0, 0, 0], t);
function desaturate(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const gray = 0.3 * r + 0.59 * g + 0.11 * b;
  const m = (c: number) => Math.round(c + (gray - c) * amount);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

// silhouette dimensions per evolution stage
const STAGE = {
  egg: { w: 120, h: 150, eye: 0, ears: false, arms: false, feet: false },
  blob: { w: 150, h: 130, eye: 18, ears: false, arms: false, feet: true },
  child: { w: 165, h: 150, eye: 17, ears: false, arms: true, feet: true },
  teen: { w: 170, h: 175, eye: 16, ears: true, arms: true, feet: true },
  grown: { w: 195, h: 195, eye: 16, ears: true, arms: true, feet: true },
} as const;

export function PetCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mutable render state kept in refs so the rAF loop reads the latest props
  // without re-subscribing every frame.
  const propsRef = useRef(props);
  propsRef.current = props;
  const particles = useRef<Particle[]>([]);
  const blink = useRef({ next: 1.5, closing: 0 });
  const lastPulse = useRef({ heart: props.heartPulse, sparkle: props.sparklePulse });
  const squash = useRef(0); // transient squash-and-stretch on interaction

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = LOGICAL * dpr;
    canvas.height = LOGICAL * dpr;

    let raf = 0;
    let start = performance.now();
    let prev = start;

    const loop = (now: number) => {
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const p = propsRef.current;

      // spawn particles when pulse counters change
      if (p.heartPulse !== lastPulse.current.heart) {
        lastPulse.current.heart = p.heartPulse;
        squash.current = 1;
        for (let i = 0; i < 7; i++) spawnHeart();
      }
      if (p.sparklePulse !== lastPulse.current.sparkle) {
        lastPulse.current.sparkle = p.sparklePulse;
        for (let i = 0; i < 22; i++) spawnSparkle();
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, t, dt, p);
      raf = requestAnimationFrame(loop);
    };

    const spawnHeart = () => {
      particles.current.push({
        x: LOGICAL / 2 + (Math.random() - 0.5) * 90,
        y: 170 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 22,
        vy: -40 - Math.random() * 40,
        life: 0,
        maxLife: 1.1 + Math.random() * 0.6,
        kind: "heart",
        hue: 330 + Math.random() * 20,
        size: 10 + Math.random() * 8,
      });
    };
    const spawnSparkle = () => {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 120;
      particles.current.push({
        x: LOGICAL / 2 + (Math.random() - 0.5) * 60,
        y: 150 + (Math.random() - 0.5) * 60,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.7,
        kind: "sparkle",
        hue: [48, 168, 280, 320][Math.floor(Math.random() * 4)],
        size: 6 + Math.random() * 8,
      });
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────────────────────────────────────────────────────── main draw

  function draw(ctx: CanvasRenderingContext2D, t: number, dt: number, p: Props) {
    const rm = p.reducedMotion;
    ctx.clearRect(0, 0, LOGICAL, LOGICAL);
    drawBackground(ctx, p, t, rm);

    // update transient squash
    if (squash.current > 0) squash.current = Math.max(0, squash.current - dt * 3);

    const base = SPECIES[p.species];
    let coat = p.equipped.color ?? base.body;
    // neglected pets lose a little color
    const dullness = (1 - p.vitality) * 0.45;
    if (dullness > 0.02) coat = desaturate(coat, dullness);

    // animation timing varies by mood
    const moodSpeed = p.mood === "happy" ? 3.4 : p.mood === "sad" ? 1.2 : p.mood === "sleepy" ? 0.8 : 2;
    const bouncePhase = rm ? 0 : Math.sin(t * moodSpeed);
    const bounceAmp = p.mood === "happy" ? 10 : p.mood === "content" ? 4 : 1.5;
    const bounceY = p.stage === "egg" ? 0 : -Math.abs(bouncePhase) * bounceAmp;
    const sway = rm ? 0 : (p.mood === "sleepy" ? Math.sin(t * 1.1) * 0.05 : Math.sin(t * 0.8) * 0.015);

    const cx = LOGICAL / 2;
    const groundY = 250;

    drawShadow(ctx, cx, groundY + 14, p.stage, bounceY);

    ctx.save();
    ctx.translate(cx, groundY + bounceY);
    ctx.rotate(sway);
    // breathing + interaction squash
    const breathe = rm ? 1 : 1 + Math.sin(t * (moodSpeed * 0.8)) * 0.025;
    const sq = squash.current;
    const sx = 1 + sq * 0.12;
    const sy = breathe * (1 - sq * 0.12);
    ctx.scale(sx, sy);

    if (p.stage === "egg") {
      drawEgg(ctx, coat, base, t, rm);
    } else {
      drawCreature(ctx, p, coat, base, t, dt, rm);
    }
    ctx.restore();

    drawCompanion(ctx, p, t, rm);
    drawParticles(ctx, dt);
  }

  // ───────────────────────────────────────────────────────── background

  function drawBackground(ctx: CanvasRenderingContext2D, p: Props, t: number, rm: boolean) {
    const bg = p.equipped.background;
    const g = ctx.createLinearGradient(0, 0, 0, LOGICAL);
    if (bg === "night" || bg === "space") {
      g.addColorStop(0, bg === "space" ? "#160d2e" : "#1b2a5a");
      g.addColorStop(1, bg === "space" ? "#2a0f47" : "#0d1430");
    } else if (bg === "beach") {
      g.addColorStop(0, "#aee7ff");
      g.addColorStop(1, "#ffe8b8");
    } else if (bg === "meadow") {
      g.addColorStop(0, "#bff0ff");
      g.addColorStop(1, "#d9ffd0");
    } else {
      g.addColorStop(0, "#fbe8ff");
      g.addColorStop(1, "#e6ecff");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LOGICAL, LOGICAL);

    if (bg === "night" || bg === "space") {
      for (let i = 0; i < 40; i++) {
        const x = (i * 53) % LOGICAL;
        const y = (i * 97) % 230;
        const tw = rm ? 0.7 : 0.5 + Math.sin(t * 2 + i) * 0.5;
        ctx.globalAlpha = 0.4 + tw * 0.5;
        ctx.fillStyle = i % 7 === 0 ? "#ffd9a8" : "#ffffff";
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
      // moon / planet
      ctx.fillStyle = bg === "space" ? "#ffcaa8" : "#fff6d6";
      ctx.beginPath();
      ctx.arc(255, 60, bg === "space" ? 26 : 22, 0, Math.PI * 2);
      ctx.fill();
      if (bg === "space") {
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(255, 60, 42, 12, -0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // sun
      ctx.fillStyle = bg === "beach" ? "#ffd25e" : "#fff1a8";
      ctx.beginPath();
      ctx.arc(60, 58, 24, 0, Math.PI * 2);
      ctx.fill();
      // soft clouds
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      const drift = rm ? 0 : (t * 6) % (LOGICAL + 80);
      cloud(ctx, ((200 + drift) % (LOGICAL + 80)) - 40, 70);
      cloud(ctx, ((40 + drift) % (LOGICAL + 80)) - 40, 110);
    }

    // ground
    if (bg === "beach") {
      ctx.fillStyle = "#f4dca0";
      ctx.fillRect(0, 248, LOGICAL, LOGICAL - 248);
      ctx.fillStyle = "rgba(110,200,255,0.6)";
      ctx.fillRect(0, 248, LOGICAL, 16);
    } else if (bg === "meadow") {
      ctx.fillStyle = "#9be08a";
      ctx.fillRect(0, 248, LOGICAL, LOGICAL - 248);
    } else if (bg === "night" || bg === "space") {
      ctx.fillStyle = bg === "space" ? "rgba(255,255,255,0.06)" : "#10203f";
      ctx.fillRect(0, 256, LOGICAL, LOGICAL - 256);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(0, 256, LOGICAL, LOGICAL - 256);
    }
  }

  function cloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.arc(x + 18, y + 4, 13, 0, Math.PI * 2);
    ctx.arc(x - 16, y + 5, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, stage: EvolutionStage, bounceY: number) {
    const s = STAGE[stage];
    const shrink = 1 - Math.min(0.3, Math.abs(bounceY) / 60);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.beginPath();
    ctx.ellipse(x, y, (s.w / 2.4) * shrink, 12 * shrink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ───────────────────────────────────────────────────────── egg

  function drawEgg(ctx: CanvasRenderingContext2D, coat: string, base: (typeof SPECIES)[PetSpecies], t: number, rm: boolean) {
    const wob = rm ? 0 : Math.sin(t * 2) * 0.04;
    ctx.rotate(wob);
    const w = STAGE.egg.w;
    const h = STAGE.egg.h;
    const grd = ctx.createLinearGradient(0, -h, 0, 0);
    grd.addColorStop(0, lighten(coat, 0.35));
    grd.addColorStop(1, coat);
    ctx.fillStyle = grd;
    ctx.beginPath();
    // egg = teardrop: narrow top, round bottom
    ctx.moveTo(0, -h);
    ctx.bezierCurveTo(w * 0.62, -h, w * 0.55, 0, 0, 0);
    ctx.bezierCurveTo(-w * 0.55, 0, -w * 0.62, -h, 0, -h);
    ctx.fill();
    // spots
    ctx.fillStyle = darken(coat, 0.12);
    for (const [sx, sy, r] of [[-20, -90, 9], [22, -60, 7], [-8, -40, 6], [16, -110, 5]] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // crack
    ctx.strokeStyle = darken(coat, 0.35);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -h * 0.5);
    ctx.lineTo(-14, -h * 0.55);
    ctx.lineTo(-2, -h * 0.45);
    ctx.lineTo(12, -h * 0.58);
    ctx.lineTo(w * 0.5, -h * 0.48);
    ctx.stroke();
    // highlight
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(-w * 0.22, -h * 0.62, 12, 22, -0.3, 0, Math.PI * 2);
    ctx.fill();
    void base;
  }

  // ───────────────────────────────────────────────────────── creature

  function drawCreature(
    ctx: CanvasRenderingContext2D,
    p: Props,
    coat: string,
    base: (typeof SPECIES)[PetSpecies],
    t: number,
    dt: number,
    rm: boolean,
  ) {
    const s = STAGE[p.stage];
    const w = s.w;
    const h = s.h;

    // feet
    if (s.feet) {
      ctx.fillStyle = darken(coat, 0.12);
      for (const fx of [-w * 0.22, w * 0.22]) {
        ctx.beginPath();
        ctx.ellipse(fx, -2, 18, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ears (drawn behind body)
    if (s.ears) {
      ctx.fillStyle = coat;
      const earWiggle = rm ? 0 : Math.sin(t * 2.2) * 0.08;
      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.translate(dir * w * 0.28, -h * 0.82);
        ctx.rotate(dir * (0.2 + earWiggle));
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = base.cheek;
        ctx.beginPath();
        ctx.ellipse(0, 4, 6, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = coat;
        ctx.restore();
      }
    }

    // body (rounded blob)
    const bodyGrad = ctx.createRadialGradient(0, -h * 0.55, 10, 0, -h * 0.4, w);
    bodyGrad.addColorStop(0, lighten(coat, 0.22));
    bodyGrad.addColorStop(1, coat);
    ctx.fillStyle = bodyGrad;
    blob(ctx, w, h);

    // belly
    ctx.fillStyle = p.equipped.color ? lighten(coat, 0.5) : base.belly;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.26, w * 0.27, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // arms
    if (s.arms) {
      ctx.fillStyle = coat;
      const wave = rm ? 0 : (p.mood === "happy" ? Math.sin(t * 6) * 0.5 : 0);
      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.translate(dir * w * 0.4, -h * 0.42);
        ctx.rotate(dir * (0.4 + (dir === 1 ? wave : 0)));
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    drawFace(ctx, p, base, t, h, s.eye, rm, dt);

    // hat sits on top
    drawHat(ctx, p.equipped.hat, h, w);
  }

  function blob(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const hw = w / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // bottom-left up to head and around — symmetric bezier blob
    ctx.bezierCurveTo(-hw, 4, -hw * 1.05, -h * 0.7, -hw * 0.55, -h * 0.92);
    ctx.bezierCurveTo(-hw * 0.25, -h * 1.04, hw * 0.25, -h * 1.04, hw * 0.55, -h * 0.92);
    ctx.bezierCurveTo(hw * 1.05, -h * 0.7, hw, 4, 0, 0);
    ctx.closePath();
    ctx.fill();
  }

  function drawFace(
    ctx: CanvasRenderingContext2D,
    p: Props,
    base: (typeof SPECIES)[PetSpecies],
    t: number,
    h: number,
    eyeR: number,
    rm: boolean,
    dt: number,
  ) {
    const eyeY = -h * 0.55;
    const eyeDX = eyeR * 1.9;
    const mood = p.mood;

    // blink timing
    if (!rm) {
      blink.current.next -= dt;
      if (blink.current.closing > 0) blink.current.closing -= dt * 6;
      if (blink.current.next <= 0) {
        blink.current.closing = 1;
        blink.current.next = 2 + Math.random() * 3;
      }
    }
    const closed = Math.max(0, blink.current.closing);

    const drawEye = (ex: number) => {
      ctx.save();
      ctx.translate(ex, eyeY);
      if (mood === "sleepy" || mood === "sick") {
        // half-lidded: a downward arc
        ctx.strokeStyle = "#3a2f4a";
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.arc(0, 0, eyeR, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        if (mood === "sick") {
          // little spiral hint
          ctx.beginPath();
          ctx.arc(0, -2, eyeR * 0.4, 0, Math.PI * 1.6);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }
      if (mood === "happy") {
        // happy upward arc eyes ^_^
        ctx.strokeStyle = "#2f2540";
        ctx.lineWidth = 3.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, eyeR * 0.5, eyeR, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.restore();
        return;
      }
      // round eyes (content / sad) with blink
      const lid = mood === "sad" ? 0.35 : 0;
      const open = (1 - closed) * (1 - lid);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(0, 0, eyeR, eyeR * Math.max(0.08, open), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2f2540";
      const pupilY = mood === "sad" ? eyeR * 0.25 : Math.sin(t * 0.9) * eyeR * 0.12;
      ctx.beginPath();
      ctx.ellipse(0, pupilY, eyeR * 0.52, eyeR * 0.52 * Math.max(0.08, open), 0, 0, Math.PI * 2);
      ctx.fill();
      // shine
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(-eyeR * 0.25, -eyeR * 0.25, eyeR * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawEye(-eyeDX);
    drawEye(eyeDX);

    // cheeks
    if (mood === "happy" || mood === "content") {
      ctx.fillStyle = base.cheek;
      ctx.globalAlpha = mood === "happy" ? 0.9 : 0.5;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(dir * eyeDX * 1.35, eyeY + eyeR * 1.3, eyeR * 0.7, eyeR * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // mouth
    const mouthY = eyeY + eyeR * 2.4;
    ctx.strokeStyle = "#3a2f4a";
    ctx.fillStyle = "#7a3b52";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (mood === "happy") {
      // open smile
      ctx.arc(0, mouthY, eyeR * 0.95, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.fill();
    } else if (mood === "content") {
      ctx.arc(0, mouthY - 2, eyeR * 0.7, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (mood === "sad") {
      ctx.arc(0, mouthY + eyeR * 0.8, eyeR * 0.7, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
    } else if (mood === "sleepy") {
      // small o
      ctx.arc(0, mouthY, eyeR * 0.28, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // sick — wavy mouth
      ctx.moveTo(-eyeR * 0.7, mouthY);
      ctx.quadraticCurveTo(-eyeR * 0.35, mouthY - 5, 0, mouthY);
      ctx.quadraticCurveTo(eyeR * 0.35, mouthY + 5, eyeR * 0.7, mouthY);
      ctx.stroke();
    }

    // mood extras
    if (mood === "sad" && !rm) {
      // a single tear
      const ty = (t % 2) / 2;
      ctx.fillStyle = "rgba(120,190,255,0.85)";
      ctx.beginPath();
      ctx.arc(-eyeDX, eyeY + eyeR + ty * 28, 4 - ty * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (mood === "sleepy" && !rm) {
      drawZzz(ctx, eyeDX + 18, eyeY - 30, t);
    }
    if (mood === "sick") {
      // green tint cloud above
      ctx.fillStyle = "rgba(120,200,120,0.5)";
      ctx.beginPath();
      ctx.arc(eyeDX + 10, eyeY - 26, 5, 0, Math.PI * 2);
      ctx.arc(eyeDX + 20, eyeY - 30, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawZzz(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
    ctx.fillStyle = "rgba(80,80,120,0.7)";
    ctx.font = "bold 16px system-ui, sans-serif";
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.6 + i * 0.33) % 1;
      ctx.globalAlpha = 1 - ph;
      ctx.fillText("z", x + i * 8 + ph * 6, y - ph * 26 - i * 6);
    }
    ctx.globalAlpha = 1;
  }

  function drawHat(ctx: CanvasRenderingContext2D, hat: string | undefined, h: number, w: number) {
    if (!hat) return;
    const topY = -h * 1.0;
    ctx.save();
    ctx.translate(0, topY);
    switch (hat) {
      case "party": {
        ctx.fillStyle = "#ff5c8a";
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(-20, 6);
        ctx.lineTo(20, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffd34d";
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(-12 + i * 8, -28 + i * 11, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#7ed957";
        ctx.beginPath();
        ctx.arc(0, -44, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "crown": {
        ctx.fillStyle = "#ffd34d";
        ctx.beginPath();
        ctx.moveTo(-24, 4);
        ctx.lineTo(-24, -18);
        ctx.lineTo(-10, -4);
        ctx.lineTo(0, -24);
        ctx.lineTo(10, -4);
        ctx.lineTo(24, -18);
        ctx.lineTo(24, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ff5c8a";
        ctx.beginPath();
        ctx.arc(0, -6, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "bow": {
        ctx.fillStyle = "#ff5c8a";
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(dir * 22, -12);
          ctx.lineTo(dir * 22, 12);
          ctx.closePath();
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd34d";
        ctx.fill();
        break;
      }
      case "leaf": {
        ctx.strokeStyle = "#2bbf93";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.lineTo(0, -16);
        ctx.stroke();
        ctx.fillStyle = "#7ed957";
        ctx.beginPath();
        ctx.ellipse(-8, -18, 10, 6, 0.6, 0, Math.PI * 2);
        ctx.ellipse(8, -20, 10, 6, -0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "wizard": {
        ctx.fillStyle = "#5b3fb0";
        ctx.beginPath();
        ctx.moveTo(0, -52);
        ctx.lineTo(-26, 6);
        ctx.lineTo(26, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffd34d";
        for (const [sx, sy] of [[-6, -20], [8, -34], [-2, -6]] as const) star(ctx, sx, sy, 4);
        break;
      }
    }
    ctx.restore();
    void w;
  }

  function drawCompanion(ctx: CanvasRenderingContext2D, p: Props, t: number, rm: boolean) {
    const c = p.equipped.companion;
    if (!c) return;
    const orbit = rm ? 0 : t;
    const x = LOGICAL / 2 + Math.cos(orbit * 1.3) * 110;
    const y = 150 + Math.sin(orbit * 1.7) * 40;
    if (c === "butterfly") {
      ctx.save();
      ctx.translate(x, y);
      const flap = rm ? 1 : 0.6 + Math.abs(Math.sin(t * 10)) * 0.5;
      ctx.fillStyle = "#ff8fc4";
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(dir * 7 * flap, 0, 7 * flap, 10, dir * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#5b3fb0";
      ctx.fillRect(-1.5, -8, 3, 16);
      ctx.restore();
    } else if (c === "firefly") {
      const glow = 0.5 + (rm ? 0.4 : Math.abs(Math.sin(t * 4)) * 0.5);
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.fillStyle = "#fff3a0";
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffd34d";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles(ctx: CanvasRenderingContext2D, dt: number) {
    const list = particles.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const pt = list[i];
      pt.life += dt;
      if (pt.life >= pt.maxLife) {
        list.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 30 * dt; // gentle gravity
      const k = 1 - pt.life / pt.maxLife;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.translate(pt.x, pt.y);
      if (pt.kind === "heart") {
        ctx.fillStyle = `hsl(${pt.hue} 85% 65%)`;
        heart(ctx, pt.size * (0.6 + k * 0.4));
      } else {
        ctx.fillStyle = `hsl(${pt.hue} 90% 70%)`;
        star(ctx, 0, 0, pt.size * (0.5 + k * 0.5));
      }
      ctx.restore();
    }
  }

  function heart(ctx: CanvasRenderingContext2D, s: number) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(s * 0.5, -s * 0.3, s, s * 0.2, 0, s);
    ctx.bezierCurveTo(-s, s * 0.2, -s * 0.5, -s * 0.3, 0, s * 0.3);
    ctx.fill();
  }

  return (
    <canvas
      ref={canvasRef}
      className="pet-canvas"
      style={{ width: "100%", maxWidth: 360, aspectRatio: "1 / 1" }}
      role="img"
      aria-label={`Your pet looks ${props.mood}`}
    />
  );
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}
