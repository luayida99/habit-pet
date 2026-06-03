import { useEffect, useRef, useState } from "react";
import type { MiniGameDef } from "../game/minigames";
import { play } from "../game/sound";

interface Props {
  def: MiniGameDef;
  petEmoji: string;
  highScore: number;
  onComplete: (score: number) => void;
  onExit: () => void;
  sound: boolean;
}

const W = 320;
const H = 440;
const ROUND_MS = 30_000;
const TREATS = ["🍬", "🍭", "🍓", "🍪", "🍎", "🍑", "🥨", "🍯"];
const CATCH_HALF = 34;

interface Obj {
  x: number;
  y: number;
  vy: number;
  emoji: string;
  bomb: boolean;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

/** Catch falling treats with your basket; dodge the bombs. */
export function TreatCatchGame({ def, petEmoji, highScore, onComplete, onExit, sound }: Props) {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [finalScore, setFinalScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const g = useRef({
    objs: [] as Obj[],
    sparks: [] as Spark[],
    basketX: W / 2,
    targetX: W / 2,
    score: 0,
    lives: 3,
    timeLeft: ROUND_MS,
    spawnAcc: 0,
    shake: 0,
  });

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let prev = performance.now();
    const s = g.current;

    const loop = (now: number) => {
      const dt = Math.min(48, now - prev);
      prev = now;
      const elapsed = ROUND_MS - s.timeLeft;
      const difficulty = 1 + elapsed / 16000; // ramps up

      s.timeLeft -= dt;
      if (s.timeLeft <= 0 || s.lives <= 0) {
        end();
        return;
      }

      // Spawn
      s.spawnAcc += dt;
      const spawnEvery = Math.max(420, 900 - elapsed / 30);
      if (s.spawnAcc >= spawnEvery) {
        s.spawnAcc = 0;
        const bomb = Math.random() < Math.min(0.28, 0.1 + elapsed / 120000);
        s.objs.push({
          x: 24 + Math.random() * (W - 48),
          y: -24,
          vy: (0.08 + Math.random() * 0.05) * difficulty,
          emoji: bomb ? "💣" : TREATS[(Math.random() * TREATS.length) | 0],
          bomb,
        });
      }

      // Move basket toward target (smooth)
      s.basketX += (s.targetX - s.basketX) * 0.35;

      // Update objects + collisions
      const basketY = H - 46;
      for (let i = s.objs.length - 1; i >= 0; i--) {
        const o = s.objs[i];
        o.y += o.vy * dt;
        if (o.y >= basketY - 18 && o.y <= basketY + 24 && Math.abs(o.x - s.basketX) < CATCH_HALF) {
          s.objs.splice(i, 1);
          if (o.bomb) {
            s.lives -= 1;
            s.shake = 14;
            play("gameover", sound);
            burst(s, o.x, basketY, "#ff5c72");
          } else {
            s.score += 1;
            play("catch", sound);
            burst(s, o.x, basketY, "#ffd34d");
          }
        } else if (o.y > H + 24) {
          s.objs.splice(i, 1);
        }
      }

      // Sparks
      for (let i = s.sparks.length - 1; i >= 0; i--) {
        const sp = s.sparks[i];
        sp.life -= dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vy += 0.0008 * dt;
        if (sp.life <= 0) s.sparks.splice(i, 1);
      }

      if (s.shake > 0) s.shake = Math.max(0, s.shake - dt / 12);
      draw(ctx, s);
      raf = requestAnimationFrame(loop);
    };

    const end = () => {
      setFinalScore(s.score);
      setPhase("over");
      play("gameover", sound);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function draw(ctx: CanvasRenderingContext2D, s: typeof g.current) {
    const sx = s.shake ? (Math.random() - 0.5) * s.shake : 0;
    const sy = s.shake ? (Math.random() - 0.5) * s.shake : 0;
    ctx.save();
    ctx.translate(sx, sy);

    // background
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#fbe8ff");
    grd.addColorStop(1, "#e6ecff");
    ctx.fillStyle = grd;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // sparks
    for (const sp of s.sparks) {
      ctx.globalAlpha = Math.max(0, sp.life / 400);
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // objects
    ctx.font = "26px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const o of s.objs) ctx.fillText(o.emoji, o.x, o.y);

    // basket (pet holding a basket)
    const by = H - 40;
    ctx.font = "30px serif";
    ctx.fillText("🧺", s.basketX, by + 6);
    ctx.font = "20px serif";
    ctx.fillText(petEmoji, s.basketX, by - 18);

    // HUD
    ctx.fillStyle = "#2c2540";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`⭐ ${s.score}`, 12, 22);
    ctx.textAlign = "center";
    ctx.fillText(`${Math.ceil(s.timeLeft / 1000)}s`, W / 2, 22);
    ctx.textAlign = "right";
    ctx.fillText("❤️".repeat(Math.max(0, s.lives)), W - 12, 22);

    ctx.restore();
  }

  // pointer / keyboard control
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const move = (clientX: number) => {
      const r = canvas.getBoundingClientRect();
      g.current.targetX = Math.max(CATCH_HALF, Math.min(W - CATCH_HALF, ((clientX - r.left) / r.width) * W));
    };
    const onPointer = (e: PointerEvent) => move(e.clientX);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") g.current.targetX = Math.max(CATCH_HALF, g.current.targetX - 28);
      if (e.key === "ArrowRight") g.current.targetX = Math.min(W - CATCH_HALF, g.current.targetX + 28);
    };
    canvas.addEventListener("pointermove", onPointer);
    canvas.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase]);

  const start = () => {
    g.current = {
      objs: [], sparks: [], basketX: W / 2, targetX: W / 2,
      score: 0, lives: 3, timeLeft: ROUND_MS, spawnAcc: 0, shake: 0,
    };
    setPhase("playing");
  };

  return (
    <div className="game-modal" onClick={(e) => e.target === e.currentTarget && onExit()}>
      <div className="game-card">
        <div className="game-head">
          <h2>{def.icon} {def.name}</h2>
          <button className="icon-btn" onClick={onExit} aria-label="Close">✕</button>
        </div>

        <div className="game-stage">
          <canvas ref={canvasRef} className="game-canvas" style={{ aspectRatio: `${W} / ${H}` }} />
          {phase === "ready" && (
            <div className="game-overlay">
              <p className="game-tip">Move your basket to catch treats.<br />Dodge the 💣 — 3 lives, 30 seconds!</p>
              <p className="game-best">Best: {highScore} ⭐</p>
              <button className="btn btn-primary btn-block" onClick={start}>Start!</button>
            </div>
          )}
          {phase === "over" && (
            <div className="game-overlay">
              <div className="game-score">⭐ {finalScore}</div>
              <p className="game-best">{finalScore > highScore ? "🏆 New best!" : `Best: ${highScore}`}</p>
              <div className="game-over-actions">
                <button className="btn btn-ghost" onClick={start}>Again</button>
                <button className="btn btn-primary" onClick={() => onComplete(finalScore)}>Collect 🪙</button>
              </div>
            </div>
          )}
        </div>
        <p className="game-foot">Costs {def.energyCost}⚡ when you collect</p>
      </div>
    </div>
  );
}

function burst(s: { sparks: Spark[] }, x: number, y: number, color: string) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.05 + Math.random() * 0.12;
    s.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.06, life: 350, color });
  }
}
