import { Component, Suspense, lazy, useState, type ReactNode } from "react";
import { PetCanvas } from "./PetCanvas";
import type { EquippedCosmetics, EvolutionStage, Mood, PetSpecies } from "../game/types";

// The 3D scene (and Three.js) is code-split so the WebGL bundle only loads when
// it's actually used — and never on devices that fall back to the 2D pet.
const PetScene3D = lazy(() =>
  import("./PetScene3D").then((m) => ({ default: m.PetScene3D })),
);

export interface PetViewProps {
  stage: EvolutionStage;
  mood: Mood;
  species: PetSpecies;
  equipped: EquippedCosmetics;
  vitality: number;
  reducedMotion: boolean;
  heartPulse: number;
  sparklePulse: number;
}

let cachedSupport: boolean | null = null;
function webglSupported(): boolean {
  if (cachedSupport !== null) return cachedSupport;
  try {
    const c = document.createElement("canvas");
    cachedSupport = !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    cachedSupport = false;
  }
  return cachedSupport;
}

/**
 * Catches *any* runtime error from the 3D scene (driver quirks, context loss,
 * out-of-memory on low-end GPUs) and renders the 2D pet instead — so a WebGL
 * hiccup can never white-screen the whole app.
 */
class PetErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("3D pet failed, falling back to 2D:", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Renders the pet in 3D where supported, gracefully falling back to 2D. */
export function Pet3D(props: PetViewProps) {
  const [use3D] = useState(() => webglSupported());
  const fallback = <PetCanvas {...props} />;
  if (!use3D) return fallback;
  return (
    <PetErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <PetScene3D {...props} />
      </Suspense>
    </PetErrorBoundary>
  );
}
