import { useEffect, useRef, useState } from "react";
import type { MiniGameDef } from "../game/minigames";
import { play } from "../game/sound";

interface Props {
  def: MiniGameDef;
  highScore: number;
  onComplete: (score: number) => void;
  onExit: () => void;
  sound: boolean;
}

type Phase = "ready" | "show" | "input" | "over";

const PADS = [
  { color: "#ff6f9c", cue: "blip1" as const },
  { color: "#ffd34d", cue: "blip2" as const },
  { color: "#4b9bff", cue: "blip3" as const },
  { color: "#34c98a", cue: "blip4" as const },
];

/** Simon-style memory: repeat your pet's growing tune. Score = rounds cleared. */
export function PetSaysGame({ def, highScore, onComplete, onExit, sound }: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [active, setActive] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const seq = useRef<number[]>([]);
  const inputIdx = useRef(0);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const flash = (i: number, ms: number) => {
    setActive(i);
    play(PADS[i].cue, sound);
    timers.current.push(window.setTimeout(() => setActive(null), ms));
  };

  const playSequence = (s: number[]) => {
    setPhase("show");
    const step = Math.max(280, 620 - s.length * 25);
    s.forEach((pad, idx) => {
      timers.current.push(window.setTimeout(() => flash(pad, step * 0.6), idx * step + 400));
    });
    timers.current.push(
      window.setTimeout(() => {
        setPhase("input");
        inputIdx.current = 0;
      }, s.length * step + 450),
    );
  };

  const nextRound = () => {
    const s = [...seq.current, (Math.random() * 4) | 0];
    seq.current = s;
    playSequence(s);
  };

  const start = () => {
    clearTimers();
    seq.current = [];
    inputIdx.current = 0;
    setScore(0);
    setPhase("show");
    timers.current.push(window.setTimeout(nextRound, 300));
  };

  const onPad = (i: number) => {
    if (phase !== "input") return;
    flash(i, 200);
    if (i === seq.current[inputIdx.current]) {
      inputIdx.current += 1;
      if (inputIdx.current === seq.current.length) {
        const rounds = seq.current.length;
        setScore(rounds);
        setPhase("show");
        timers.current.push(window.setTimeout(nextRound, 700));
      }
    } else {
      play("gameover", sound);
      setPhase("over");
    }
  };

  const statusText =
    phase === "show" ? "Watch…" : phase === "input" ? "Your turn!" : "";

  return (
    <div className="game-modal" onClick={(e) => e.target === e.currentTarget && onExit()}>
      <div className="game-card">
        <div className="game-head">
          <h2>{def.icon} {def.name}</h2>
          <button className="icon-btn" onClick={onExit} aria-label="Close">✕</button>
        </div>

        <div className="says-stage">
          <div className="says-status">
            {statusText}
            {(phase === "show" || phase === "input") && <span className="says-round"> Round {seq.current.length}</span>}
          </div>
          <div className={`says-grid ${phase === "input" ? "live" : ""}`}>
            {PADS.map((p, i) => (
              <button
                key={i}
                className={`says-pad ${active === i ? "lit" : ""}`}
                style={{ background: p.color }}
                onClick={() => onPad(i)}
                disabled={phase !== "input"}
                aria-label={`pad ${i + 1}`}
              />
            ))}
          </div>

          {phase === "ready" && (
            <div className="game-overlay says-overlay">
              <p className="game-tip">Watch the tune, then tap it back.<br />Each round adds one note!</p>
              <p className="game-best">Best: {highScore} rounds</p>
              <button className="btn btn-primary btn-block" onClick={start}>Start!</button>
            </div>
          )}
          {phase === "over" && (
            <div className="game-overlay says-overlay">
              <div className="game-score">{score} rounds</div>
              <p className="game-best">{score > highScore ? "🏆 New best!" : `Best: ${highScore}`}</p>
              <div className="game-over-actions">
                <button className="btn btn-ghost" onClick={start}>Again</button>
                <button className="btn btn-primary" onClick={() => onComplete(score)}>Collect 🪙</button>
              </div>
            </div>
          )}
        </div>
        <p className="game-foot">Costs {def.energyCost}⚡ when you collect</p>
      </div>
    </div>
  );
}
