import { useMemo } from "react";
import { currentStage, petMood, topStreak, vitality } from "../game/selectors";
import type { GameState, Mood } from "../game/types";
import { PetCanvas } from "./PetCanvas";

interface Props {
  state: GameState;
  heartPulse: number;
  sparklePulse: number;
  onPet: () => void;
}

const STAGE_LABEL: Record<string, string> = {
  egg: "Egg",
  blob: "Blob",
  child: "Child",
  teen: "Teen",
  grown: "Grown",
};

const MOOD_LINES: Record<Mood, string[]> = {
  happy: ["I feel amazing!", "You're the best!", "Look at us go! 🔥", "Best day ever!"],
  content: ["Doing alright today.", "Nice and cozy.", "What's next?", "I'm here for you."],
  sad: ["I miss our streak…", "Could we do a habit?", "A little down today.", "Let's bounce back!"],
  sick: ["I'm not feeling great…", "Some care would help.", "Achoo… 🤧", "Need a little love."],
  sleepy: ["So sleepy… 😴", "*yaaawn*", "Time for a nap?", "Zzz…"],
};

export function PetStage({ state, heartPulse, sparklePulse, onPet }: Props) {
  const stage = currentStage(state);
  const mood = petMood(state);
  const vit = vitality(state);
  const streak = topStreak(state);

  // Stable-per-mood line so it doesn't flicker every render.
  const line = useMemo(() => {
    const lines = MOOD_LINES[mood];
    return lines[Math.floor((Date.now() / 6000) % lines.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, Math.floor(Date.now() / 6000)]);

  return (
    <section className="pet-stage">
      <div className="pet-bubble">{line}</div>
      <button className="pet-tap" onClick={onPet} aria-label="Pet your friend" title="Give them a pet 💞">
        <PetCanvas
          stage={stage}
          mood={mood}
          species={state.pet.species}
          equipped={state.equipped}
          vitality={vit}
          reducedMotion={state.settings.reducedMotion}
          heartPulse={heartPulse}
          sparklePulse={sparklePulse}
        />
      </button>
      <div className="pet-meta">
        <span className="pet-name">{state.pet.name}</span>
        <span className="pet-stage-tag">{STAGE_LABEL[stage]}</span>
        {streak > 0 && <span className="pet-stage-tag streak">🔥 {streak}</span>}
      </div>
      <p className="pet-hint">Tap your pet to say hi 💞</p>
    </section>
  );
}
