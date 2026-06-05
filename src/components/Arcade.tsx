import { useState } from "react";
import { MINIGAMES, miniGameDef } from "../game/minigames";
import type { GameState } from "../game/types";
import { TreatCatchGame } from "./TreatCatchGame";
import { PetSaysGame } from "./PetSaysGame";
import { CritterSafari } from "./CritterSafari";

interface Props {
  state: GameState;
  onFinish: (gameId: string, score: number) => void;
  onFinishSafari: (r: { score: number; caughtId: string | null }) => void;
}

export function Arcade({ state, onFinish, onFinishSafari }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const energy = state.pet.energy;
  const openDef = openId ? miniGameDef(openId) : undefined;

  const complete = (score: number) => {
    if (openId) onFinish(openId, score);
    setOpenId(null);
  };

  return (
    <section className="arcade">
      <div className="section-head">
        <h2>🕹️ Arcade</h2>
        <span className="chip" title="Energy">⚡ {Math.round(energy)}</span>
      </div>
      <p className="section-note">Play with your pet to earn coins. Top up energy by checking off habits!</p>

      <div className="arcade-grid">
        {MINIGAMES.map((gameItem) => {
          const stat = state.arcade[gameItem.id];
          const canPlay = energy >= gameItem.energyCost;
          return (
            <div className="arcade-card" key={gameItem.id}>
              <div className="arcade-icon">{gameItem.icon}</div>
              <div className="arcade-info">
                <div className="arcade-name">{gameItem.name}</div>
                <div className="arcade-blurb">{gameItem.blurb}</div>
                <div className="arcade-meta">
                  <span>🏆 {stat?.highScore ?? 0}</span>
                  <span>⚡ {gameItem.energyCost}</span>
                </div>
              </div>
              <button
                className={`btn ${canPlay ? "btn-primary" : "btn-locked"}`}
                disabled={!canPlay}
                onClick={() => setOpenId(gameItem.id)}
              >
                {canPlay ? "Play" : "Low ⚡"}
              </button>
            </div>
          );
        })}
      </div>

      {openDef?.id === "treat-catch" && (
        <TreatCatchGame
          def={openDef}
          petEmoji="😋"
          highScore={state.arcade[openDef.id]?.highScore ?? 0}
          onComplete={complete}
          onExit={() => setOpenId(null)}
          sound={state.settings.sound}
        />
      )}
      {openDef?.id === "pet-says" && (
        <PetSaysGame
          def={openDef}
          highScore={state.arcade[openDef.id]?.highScore ?? 0}
          onComplete={complete}
          onExit={() => setOpenId(null)}
          sound={state.settings.sound}
        />
      )}
      {openDef?.id === "critter-safari" && (
        <CritterSafari
          petEmoji="🐾"
          caughtCount={state.crittersCaught.length}
          onComplete={(r) => { onFinishSafari(r); setOpenId(null); }}
          onExit={() => setOpenId(null)}
          sound={state.settings.sound}
        />
      )}
    </section>
  );
}
