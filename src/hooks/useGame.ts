/**
 * React binding layer over the pure engine. Owns the live GameState, persists
 * it, runs the offline-decay tick, turns engine events into transient toasts,
 * and exposes pulse counters that drive the canvas's reaction animations.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as engine from "../game/engine";
import { dayKey } from "../game/dates";
import { currentStage } from "../game/selectors";
import { play } from "../game/sound";
import { clearState, loadState, saveState } from "../game/storage";
import type { EvolutionStage, GameEvent, GameState, Habit, PetSpecies, Transition } from "../game/types";

export interface Toast extends GameEvent {
  bornAt: number;
}

type Cue = Parameters<typeof play>[0];

const TICK_MS = 60_000;
const TOAST_MS = 3600;

export function useGame() {
  const [state, setState] = useState<GameState>(() => engine.applyTick(loadState()).state);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [heartPulse, setHeartPulse] = useState(0);
  const [sparklePulse, setSparklePulse] = useState(0);
  const stageRef = useRef<EvolutionStage>(currentStage(state));
  const heartBump = useCallback(() => setHeartPulse((p) => p + 1), []);
  const sparkleBump = useCallback(() => setSparklePulse((p) => p + 1), []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Auto-expire toasts.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => now - t.bornAt < TOAST_MS));
    }, 400);
    return () => clearInterval(timer);
  }, [toasts.length]);

  /**
   * Central applier: runs a transition inside a functional update (so it always
   * sees fresh state), then handles evolution detection, sound and toasts.
   * `primaryCue` may inspect the before/after state to pick a sound.
   */
  const apply = useCallback(
    (fn: (s: GameState) => Transition, primaryCue?: (prev: GameState, next: GameState) => Cue | null) =>
      setState((prev) => {
        const { state: next, events: rawEvents } = fn(prev);
        const events: GameEvent[] = [...rawEvents];

        // Evolution detection (egg → … → grown).
        const newStage = currentStage(next);
        if (newStage !== stageRef.current) {
          const hatched = stageRef.current === "egg";
          events.push({
            id: `evo-${Date.now()}`,
            kind: "evolve",
            message: hatched ? "Your egg hatched! 🐣" : `Your pet evolved into a ${newStage}! ✨`,
            icon: hatched ? "🐣" : "✨",
          });
          stageRef.current = newStage;
          sparkleBump();
          play("evolve", next.settings.sound);
        }

        // Sounds tied to event kinds.
        for (const e of events) {
          if (e.kind === "levelup") {
            play("levelup", next.settings.sound);
            sparkleBump();
          } else if (e.kind === "streak") play("levelup", next.settings.sound);
          else if (e.kind === "achievement") play("buy", next.settings.sound);
        }

        // Primary cue for the action itself.
        const cue = primaryCue?.(prev, next);
        if (cue) play(cue, next.settings.sound);

        if (events.length) {
          const born = Date.now();
          setToasts((t) => [...t, ...events.map((e) => ({ ...e, bornAt: born }))].slice(-5));
        }
        return next;
      }),
    [sparkleBump],
  );

  // Decay tick: on an interval and whenever the tab regains focus.
  useEffect(() => {
    const tick = () => apply((s) => engine.applyTick(s));
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    const id = setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, [apply]);

  // ─────────────────────────────────────────────────────── actions

  const onboard = useCallback(
    (opts: { name: string; species: PetSpecies; starters: boolean }) =>
      setState((s) => {
        const next = engine.completeOnboarding(s, opts);
        stageRef.current = currentStage(next);
        return next;
      }),
    [],
  );

  const toggleHabit = useCallback(
    (id: string) =>
      apply(
        (s) => engine.toggleHabit(s, id),
        (prev) => {
          const wasDone = prev.habits.find((h) => h.id === id)?.history.includes(dayKey());
          return wasDone ? "undo" : "complete";
        },
      ),
    [apply],
  );

  const addHabit = useCallback(
    (input: { name: string; emoji: string; color: string }) =>
      apply((s) => ({ state: engine.addHabit(s, input), events: [] })),
    [apply],
  );
  const editHabit = useCallback(
    (id: string, patch: Partial<Pick<Habit, "name" | "emoji" | "color">>) =>
      setState((s) => engine.editHabit(s, id, patch)),
    [],
  );
  const archiveHabit = useCallback((id: string) => setState((s) => engine.archiveHabit(s, id)), []);

  const petPet = useCallback(() => {
    heartBump();
    apply((s) => engine.petInteract(s), () => "pet");
  }, [apply, heartBump]);

  const buy = useCallback(
    (itemId: string) =>
      apply(
        (s) => engine.buyItem(s, itemId),
        (prev, next) => (next.coins !== prev.coins || next.equipped !== prev.equipped ? "buy" : "error"),
      ),
    [apply],
  );
  const equip = useCallback(
    (itemId: string) => apply((s) => ({ state: engine.equipItem(s, itemId), events: [] }), () => "pet"),
    [apply],
  );

  const claimQuest = useCallback(
    (questId: string) => apply((s) => engine.claimQuest(s, questId), () => "quest"),
    [apply],
  );

  const setSettings = useCallback(
    (patch: Partial<GameState["settings"]>) =>
      setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    [],
  );

  const resetGame = useCallback(() => {
    clearState();
    const fresh = engine.createInitialState();
    stageRef.current = currentStage(fresh);
    setState(fresh);
    setToasts([]);
  }, []);

  return {
    state,
    toasts,
    heartPulse,
    sparklePulse,
    actions: {
      onboard,
      toggleHabit,
      addHabit,
      editHabit,
      archiveHabit,
      petPet,
      buy,
      equip,
      claimQuest,
      setSettings,
      resetGame,
    },
  };
}

export type GameApi = ReturnType<typeof useGame>;
