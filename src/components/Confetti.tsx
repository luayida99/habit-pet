import { useEffect, useRef } from "react";

interface Props {
  /** Increment to fire a burst. */
  trigger: number;
  reducedMotion: boolean;
}

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  life: number;
}

const COLORS = ["#ff6f9c", "#ffd34d", "#7c5cff", "#34c98a", "#4b9bff", "#ff8a5c"];

/** Lightweight full-screen confetti burst, fired whenever `trigger` changes. */
export function Confetti({ trigger, reducedMotion }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bits = useRef<Bit[]>([]);
  const last = useRef(trigger);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let prev = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => {
      if (reducedMotion) return;
      const w = window.innerWidth;
      const cx = w / 2;
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI - Math.PI; // upward fan
        const sp = 4 + Math.random() * 9;
        bits.current.push({
          x: cx + (Math.random() - 0.5) * 120,
          y: window.innerHeight * 0.4,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 4,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.4,
          size: 6 + Math.random() * 7,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          life: 0,
        });
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(2, (now - prev) / 16.67);
      prev = now;
      if (trigger !== last.current) {
        last.current = trigger;
        spawn();
      }
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const list = bits.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        b.life += dt;
        b.vy += 0.22 * dt;
        b.vx *= 0.99;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += b.vr * dt;
        if (b.y > window.innerHeight + 20 || b.life > 240) {
          list.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.globalAlpha = Math.max(0, 1 - b.life / 240);
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size * 0.6);
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return <canvas ref={ref} className="confetti-layer" aria-hidden="true" />;
}
