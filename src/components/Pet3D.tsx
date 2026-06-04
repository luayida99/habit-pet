import { Suspense, lazy, useState } from "react";
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

/** Renders the pet in 3D where supported, gracefully falling back to 2D. */
export function Pet3D(props: PetViewProps) {
  const [use3D] = useState(() => webglSupported());
  if (!use3D) return <PetCanvas {...props} />;
  return (
    <Suspense fallback={<PetCanvas {...props} />}>
      <PetScene3D {...props} />
    </Suspense>
  );
}
