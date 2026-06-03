import type { PetState } from "../game/types";

interface Props {
  pet: PetState;
}

const BARS: { key: keyof Pick<PetState, "happiness" | "health" | "energy">; label: string; icon: string; color: string }[] = [
  { key: "happiness", label: "Happiness", icon: "😊", color: "#ff8fc4" },
  { key: "health", label: "Health", icon: "❤️", color: "#ff6f6f" },
  { key: "energy", label: "Energy", icon: "⚡", color: "#ffc24b" },
];

export function StatBars({ pet }: Props) {
  return (
    <div className="stat-bars">
      {BARS.map((b) => {
        const v = pet[b.key];
        return (
          <div className="stat-bar" key={b.key}>
            <span className="stat-bar-icon" title={b.label}>{b.icon}</span>
            <div className="stat-bar-track">
              <div
                className="stat-bar-fill"
                style={{ width: `${v}%`, background: b.color }}
              />
            </div>
            <span className="stat-bar-val">{Math.round(v)}</span>
          </div>
        );
      })}
    </div>
  );
}
