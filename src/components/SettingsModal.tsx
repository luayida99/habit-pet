import { useState } from "react";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
  onClose: () => void;
  onChange: (patch: Partial<GameState["settings"]>) => void;
  onReset: () => void;
}

export function SettingsModal({ state, onClose, onChange, onReset }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <label className="toggle-row">
          <span>🔊 Sound effects</span>
          <input
            type="checkbox"
            checked={state.settings.sound}
            onChange={(e) => onChange({ sound: e.target.checked })}
          />
        </label>

        <label className="toggle-row">
          <span>🐢 Reduce motion</span>
          <input
            type="checkbox"
            checked={state.settings.reducedMotion}
            onChange={(e) => onChange({ reducedMotion: e.target.checked })}
          />
        </label>

        <div className="modal-section">
          <p className="modal-note">
            HabitPet saves automatically in this browser. Your pet, streaks and coins live on
            this device.
          </p>
        </div>

        <div className="modal-danger">
          {!confirmReset ? (
            <button className="btn btn-danger-ghost" onClick={() => setConfirmReset(true)}>
              Start over
            </button>
          ) : (
            <div className="confirm-row">
              <span>Erase everything and re-hatch?</span>
              <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>No</button>
              <button className="btn btn-danger" onClick={() => { onReset(); onClose(); }}>Yes, reset</button>
            </div>
          )}
        </div>

        <p className="modal-credit">HabitPet v1.0 · made with 💞</p>
      </div>
    </div>
  );
}
