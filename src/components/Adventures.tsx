import { useEffect, useState } from "react";
import { ADVENTURES, adventureDef } from "../game/adventures";
import { adventureProgress, adventureReady, adventureRemainingMs } from "../game/selectors";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
  onStart: (id: string) => void;
  onCollect: () => void;
}

function fmtRemaining(ms: number): string {
  if (ms <= 0) return "Ready to collect!";
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min left`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m left`;
}

const fmtDur = (min: number) => (min < 60 ? `${min} min` : `${min / 60} hr`);

/** Live ticking hook (1 Hz) used while an adventure is in flight. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export function Adventures({ state, onStart, onCollect }: Props) {
  const now = useNow(state.adventure != null);
  const adv = state.adventure;
  const def = adv ? adventureDef(adv.defId) : null;
  const energy = state.pet.energy;

  return (
    <section className="adventures">
      <div className="section-head">
        <h2>🧭 Adventures</h2>
        <span className="chip" title="Energy">⚡ {Math.round(energy)}</span>
      </div>

      {adv && def ? (
        <div className="adv-active">
          <div className="adv-active-icon">{def.icon}</div>
          <div className="adv-active-body">
            <div className="adv-active-name">{def.name}</div>
            <div className="adv-track">
              <div className="adv-fill" style={{ width: `${Math.round(adventureProgress(state, now) * 100)}%` }} />
            </div>
            <div className="adv-remaining">{fmtRemaining(adventureRemainingMs(state, now))}</div>
          </div>
          <button
            className={`btn ${adventureReady(state, now) ? "btn-primary" : "btn-locked"}`}
            disabled={!adventureReady(state, now)}
            onClick={onCollect}
          >
            {adventureReady(state, now) ? "Collect 🎁" : "Exploring…"}
          </button>
        </div>
      ) : (
        <>
          <p className="section-note">Send your pet exploring. It returns with coins and rare discoveries — even while you're away.</p>
          <div className="adv-grid">
            {ADVENTURES.map((a) => {
              const canGo = energy >= a.energyCost;
              return (
                <div className="adv-card" key={a.id}>
                  <div className="adv-icon">{a.icon}</div>
                  <div className="adv-info">
                    <div className="adv-name">{a.name}</div>
                    <div className="adv-blurb">{a.blurb}</div>
                    <div className="adv-meta">
                      <span>⏱ {fmtDur(a.durationMin)}</span>
                      <span>⚡ {a.energyCost}</span>
                      <span>🪙 {a.coins[0]}–{a.coins[1]}</span>
                    </div>
                  </div>
                  <button
                    className={`btn ${canGo ? "btn-primary" : "btn-locked"}`}
                    disabled={!canGo}
                    onClick={() => onStart(a.id)}
                  >
                    {canGo ? "Send" : "Low ⚡"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

/** Compact Home banner; renders only while an adventure is active. */
export function AdventureBanner({ state, onCollect }: { state: GameState; onCollect: () => void }) {
  const now = useNow(state.adventure != null);
  const adv = state.adventure;
  const def = adv ? adventureDef(adv.defId) : null;
  if (!adv || !def) return null;
  const ready = adventureReady(state, now);

  return (
    <button className={`adv-banner ${ready ? "ready" : ""}`} onClick={ready ? onCollect : undefined} disabled={!ready}>
      <span className="adv-banner-icon">{def.icon}</span>
      <span className="adv-banner-body">
        <span className="adv-banner-name">{def.name}</span>
        <span className="adv-banner-track">
          <span className="adv-banner-fill" style={{ width: `${Math.round(adventureProgress(state, now) * 100)}%` }} />
        </span>
      </span>
      <span className="adv-banner-status">{ready ? "Collect 🎁" : fmtRemaining(adventureRemainingMs(state, now))}</span>
    </button>
  );
}
