import { useEffect, useRef, useState } from "react";
import {
  MOVES,
  PET_MAX_HP,
  TYPE_META,
  catchChance,
  critterAttack,
  moveDamage,
  rollWildCritter,
  safariScore,
  type Critter,
  type Move,
} from "../game/critters";
import { play } from "../game/sound";

interface Props {
  petEmoji: string;
  caughtCount: number;
  onComplete: (r: { score: number; caughtId: string | null }) => void;
  onExit: () => void;
  sound: boolean;
}

type Phase = "ready" | "battle" | "result";
type Outcome = "caught" | "ko" | "fainted";

const rng = () => Math.random();
const MOVE_SOUND: Record<string, Parameters<typeof play>[0]> = {
  leaf: "blip3", fire: "blip2", water: "blip1", spark: "blip4",
};

export function CritterSafari({ petEmoji, caughtCount, onComplete, onExit, sound }: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [wild, setWild] = useState<Critter | null>(null);
  const [wildHp, setWildHp] = useState(0);
  const [petHp, setPetHp] = useState(PET_MAX_HP);
  const [logMsg, setLogMsg] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [shake, setShake] = useState(false);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);

  const after = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = () => {
    const w = rollWildCritter(rng);
    setWild(w);
    setWildHp(w.maxHp);
    setPetHp(PET_MAX_HP);
    setOutcome(null);
    setLogMsg(`A wild ${w.name} appeared!`);
    setPhase("battle");
    busy.current = false;
  };

  const finishWith = (o: Outcome) => {
    setOutcome(o);
    setPhase("result");
    busy.current = false;
    if (o === "caught") play("gacha", sound);
    else if (o === "fainted") play("gameover", sound);
  };

  const enemyTurn = (w: Critter, currentPetHp: number) => {
    const dmg = critterAttack(w, rng);
    const np = Math.max(0, currentPetHp - dmg);
    setPetHp(np);
    setLogMsg(`${w.name} strikes back for ${dmg}!`);
    setShake(true);
    after(280, () => setShake(false));
    if (np <= 0) {
      after(700, () => finishWith("fainted"));
    } else {
      after(650, () => { busy.current = false; });
    }
  };

  const useMove = (move: Move) => {
    if (busy.current || phase !== "battle" || !wild) return;
    busy.current = true;
    const { damage, effectiveness } = moveDamage(move, wild.type, rng);
    const nhp = Math.max(0, wildHp - damage);
    setWildHp(nhp);
    play(MOVE_SOUND[move.type], sound);
    const tag = effectiveness > 1 ? " It's super effective!" : effectiveness < 1 ? " Not very effective…" : "";
    setLogMsg(`${move.name} hits for ${damage}!${tag}`);
    if (nhp <= 0) {
      after(750, () => finishWith("ko"));
    } else {
      after(900, () => enemyTurn(wild, petHp));
    }
  };

  const throwCapsule = () => {
    if (busy.current || phase !== "battle" || !wild) return;
    busy.current = true;
    const chance = catchChance(wild, wildHp);
    setLogMsg("You toss a Capsule… 🔴");
    play("blip1", sound);
    after(950, () => {
      if (rng() < chance) {
        finishWith("caught");
      } else {
        setLogMsg(`${wild.name} broke free!`);
        after(800, () => enemyTurn(wild, petHp));
      }
    });
  };

  const wildPct = wild ? Math.round((wildHp / wild.maxHp) * 100) : 0;
  const petPct = Math.round((petHp / PET_MAX_HP) * 100);
  const chancePct = wild ? Math.round(catchChance(wild, wildHp) * 100) : 0;

  return (
    <div className="game-modal" onClick={(e) => e.target === e.currentTarget && onExit()}>
      <div className="game-card">
        <div className="game-head">
          <h2>🌿 Critter Safari</h2>
          <button className="icon-btn" onClick={onExit} aria-label="Close">✕</button>
        </div>

        {phase === "ready" && (
          <div className="safari-intro">
            <div className="safari-intro-art">🌿🔴</div>
            <p className="game-tip">
              Wild critters roam the tall grass! Weaken one with type-smart moves,
              then toss a Capsule to catch it for your Dex.
            </p>
            <p className="game-best">Caught so far: {caughtCount}</p>
            <button className="btn btn-primary btn-block" onClick={start}>Enter the grass!</button>
          </div>
        )}

        {phase === "battle" && wild && (
          <div className={`safari-stage ${shake ? "shake" : ""}`}>
            <div className="safari-row enemy">
              <div className="safari-hpwrap">
                <div className="safari-name">
                  {wild.name}
                  <span className="type-badge" style={{ background: TYPE_META[wild.type].color }}>
                    {TYPE_META[wild.type].icon} {TYPE_META[wild.type].label}
                  </span>
                </div>
                <div className="hpbar"><div className="hp-fill" style={{ width: `${wildPct}%` }} /></div>
              </div>
              <div className="safari-critter">{wild.emoji}</div>
            </div>

            <div className="safari-row pet">
              <div className="safari-pet-emoji">{petEmoji}</div>
              <div className="safari-hpwrap">
                <div className="safari-name">Your pet</div>
                <div className="hpbar"><div className="hp-fill pet" style={{ width: `${petPct}%` }} /></div>
              </div>
            </div>

            <div className="safari-log">{logMsg}</div>

            <div className="safari-moves">
              {MOVES.map((m) => (
                <button
                  key={m.id}
                  className="move-btn"
                  style={{ background: TYPE_META[m.type].color }}
                  onClick={() => useMove(m)}
                >
                  <span>{TYPE_META[m.type].icon} {m.name}</span>
                </button>
              ))}
            </div>
            <button className="btn capsule-btn btn-block" onClick={throwCapsule}>
              🔴 Toss Capsule <span className="capsule-odds">({chancePct}% chance)</span>
            </button>
          </div>
        )}

        {phase === "result" && wild && (
          <div className="safari-result">
            <div className="safari-result-art">
              {outcome === "caught" ? "🔴✨" : outcome === "ko" ? "💥" : "😵"}
            </div>
            <div className="game-score" style={{ fontSize: 26 }}>
              {outcome === "caught" && `Gotcha! ${wild.emoji}`}
              {outcome === "ko" && `${wild.name} fainted!`}
              {outcome === "fainted" && "Your pet is worn out!"}
            </div>
            <p className="game-best">
              {outcome === "caught"
                ? `${wild.name} joined your Dex!`
                : outcome === "ko"
                  ? "It got away — try to catch the next one!"
                  : "Better luck next time."}
            </p>
            <div className="game-over-actions">
              <button className="btn btn-ghost" onClick={start}>Again</button>
              <button
                className="btn btn-primary"
                onClick={() =>
                  onComplete({
                    score: safariScore(wild, outcome === "caught" ? "caught" : outcome === "ko" ? "ko" : "fled"),
                    caughtId: outcome === "caught" ? wild.id : null,
                  })
                }
              >
                Collect 🪙
              </button>
            </div>
          </div>
        )}
        <p className="game-foot">Costs 10⚡ when you collect</p>
      </div>
    </div>
  );
}
