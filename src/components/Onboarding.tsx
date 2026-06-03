import { useState } from "react";
import { SPECIES } from "../game/constants";
import type { PetSpecies } from "../game/types";
import { PetCanvas } from "./PetCanvas";

interface Props {
  onDone: (opts: { name: string; species: PetSpecies; starters: boolean }) => void;
}

const SPECIES_ORDER: PetSpecies[] = ["mint", "peach", "berry", "sky"];

export function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [species, setSpecies] = useState<PetSpecies>("mint");
  const [name, setName] = useState("");
  const [starters, setStarters] = useState(true);

  return (
    <div className="onboard">
      <div className="onboard-card">
        {step === 0 && (
          <>
            <h1 className="onboard-title">HabitPet 🐣</h1>
            <p className="onboard-sub">
              Meet a little creature whose mood depends on you showing up. Build habits,
              keep your streaks alive, and watch your pet thrive and grow.
            </p>
            <div className="onboard-preview">
              <PetCanvas
                stage="blob"
                mood="happy"
                species={species}
                equipped={{}}
                vitality={1}
                reducedMotion={false}
                heartPulse={0}
                sparklePulse={0}
              />
            </div>
            <button className="btn btn-primary btn-block" onClick={() => setStep(1)}>
              Adopt a pet →
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="onboard-h2">Choose your friend</h2>
            <div className="species-grid">
              {SPECIES_ORDER.map((sp) => (
                <button
                  key={sp}
                  className={`species-tile ${species === sp ? "selected" : ""}`}
                  style={{ background: SPECIES[sp].belly, borderColor: SPECIES[sp].body }}
                  onClick={() => setSpecies(sp)}
                >
                  <span className="species-dot" style={{ background: SPECIES[sp].body }} />
                  <span className="species-name">{SPECIES[sp].label}</span>
                </button>
              ))}
            </div>
            <div className="onboard-preview small">
              <PetCanvas
                stage="blob"
                mood="content"
                species={species}
                equipped={{}}
                vitality={1}
                reducedMotion={false}
                heartPulse={0}
                sparklePulse={0}
              />
            </div>
            <div className="onboard-actions">
              <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>Next →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="onboard-h2">Name your {SPECIES[species].label}</h2>
            <input
              className="text-input big"
              autoFocus
              maxLength={16}
              placeholder={SPECIES[species].label}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onDone({ name, species, starters })}
            />
            <label className="checkbox-row">
              <input type="checkbox" checked={starters} onChange={(e) => setStarters(e.target.checked)} />
              <span>Start me off with a few habit ideas</span>
            </label>
            <div className="onboard-actions">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={() => onDone({ name, species, starters })}>
                Hatch! 🥚
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
