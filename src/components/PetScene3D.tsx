/**
 * The 3D pet — a procedurally-built creature rendered with Three.js (WebGL).
 *
 * Mirrors {@link PetCanvas}'s props so it's a drop-in upgrade: the silhouette
 * changes with evolution stage, the face/colour reflect mood + vitality,
 * cosmetics (coat, hat, scene, companion) are real meshes, and petting / level
 * ups spawn 3D particle bursts. Everything is built from primitives — no model
 * files — and tuned to stay light on mobile (low poly, capped pixel ratio,
 * paused when offscreen).
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SPECIES } from "../game/constants";
import type { EquippedCosmetics, EvolutionStage, Mood, PetSpecies } from "../game/types";

interface Props {
  stage: EvolutionStage;
  mood: Mood;
  species: PetSpecies;
  equipped: EquippedCosmetics;
  vitality: number;
  reducedMotion: boolean;
  heartPulse: number;
  sparklePulse: number;
}

const STAGE_SCALE: Record<EvolutionStage, number> = {
  egg: 1, blob: 0.82, child: 0.95, teen: 1.08, grown: 1.2,
};
const STAGE_FEATURES: Record<EvolutionStage, { ears: boolean; arms: boolean; feet: boolean }> = {
  egg: { ears: false, arms: false, feet: false },
  blob: { ears: false, arms: false, feet: true },
  child: { ears: false, arms: true, feet: true },
  teen: { ears: true, arms: true, feet: true },
  grown: { ears: true, arms: true, feet: true },
};

const BG_GRADIENTS: Record<string, [string, string]> = {
  default: ["#fbe8ff", "#e6ecff"],
  meadow: ["#bff0ff", "#d9ffd0"],
  beach: ["#aee7ff", "#ffe8b8"],
  night: ["#26407f", "#0d1430"],
  space: ["#2a1147", "#160d2e"],
  aurora: ["#123", "#0a1530"],
};

function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export function PetScene3D(props: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── renderer / scene / camera ──────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.borderRadius = "20px";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.7, 5.8);
    camera.lookAt(0, 0.38, 0); // aim a touch high so tall hats stay in frame

    // ── lights (soft, cute) ────────────────────────────────────
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb9a6d6, 1.1);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2.5, 4, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd9f0, 0.5);
    rim.position.set(-3, 1, -2);
    scene.add(rim);

    // ── materials ──────────────────────────────────────────────
    const speciesMeta = SPECIES[props.species];
    const bodyMat = new THREE.MeshToonMaterial({ color: hexToColor(speciesMeta.body) });
    const bellyMat = new THREE.MeshToonMaterial({ color: hexToColor(speciesMeta.belly) });
    const darkMat = new THREE.MeshToonMaterial({ color: hexToColor(speciesMeta.body).multiplyScalar(0.82) });
    const whiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const eyeMat = new THREE.MeshToonMaterial({ color: 0x2f2540 });
    const cheekMat = new THREE.MeshToonMaterial({ color: hexToColor(speciesMeta.cheek), transparent: true, opacity: 0.85 });
    const mouthMat = new THREE.MeshToonMaterial({ color: 0x7a3b52 });

    // ── root + creature group ──────────────────────────────────
    const root = new THREE.Group();
    scene.add(root);
    const creature = new THREE.Group();
    root.add(creature);

    const sphere = (r: number, mat: THREE.Material) =>
      new THREE.Mesh(new THREE.SphereGeometry(r, 32, 32), mat);

    // body
    const body = sphere(1, bodyMat);
    body.scale.set(1, 0.96, 0.9);
    creature.add(body);

    // belly
    const belly = sphere(0.62, bellyMat);
    belly.scale.set(1, 1.05, 0.55);
    belly.position.set(0, -0.16, 0.62);
    creature.add(belly);

    // eyes (each: white + pupil + highlight) grouped so we can blink/scale
    const makeEye = (x: number) => {
      const g = new THREE.Group();
      const white = sphere(0.17, whiteMat);
      white.scale.set(1, 1.15, 0.7);
      const pupil = sphere(0.1, eyeMat);
      pupil.position.set(0, 0, 0.12);
      const shine = sphere(0.035, whiteMat);
      shine.position.set(-0.05, 0.05, 0.2);
      g.add(white, pupil, shine);
      g.position.set(x, 0.16, 0.78);
      g.userData.pupil = pupil;
      creature.add(g);
      return g;
    };
    const eyeL = makeEye(-0.3);
    const eyeR = makeEye(0.3);

    // eyelids (for sleepy / sick / blink) — thin dark caps over the top of eyes
    const makeLid = (x: number) => {
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
      lid.position.set(x, 0.16, 0.74);
      lid.scale.set(1, 0.9, 0.7);
      lid.visible = false;
      creature.add(lid);
      return lid;
    };
    const lidL = makeLid(-0.3);
    const lidR = makeLid(0.3);

    // cheeks
    const makeCheek = (x: number) => {
      const c = sphere(0.12, cheekMat);
      c.scale.set(1, 0.62, 0.35);
      c.position.set(x, -0.06, 0.8);
      creature.add(c);
      return c;
    };
    const cheekL = makeCheek(-0.4);
    const cheekR = makeCheek(0.4);

    // mouth: a smile arc (half-torus) + an open-mouth ellipsoid
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 12, 24, Math.PI), mouthMat);
    smile.position.set(0, -0.12, 0.84);
    smile.rotation.z = Math.PI; // U shape
    creature.add(smile);
    const openMouth = sphere(0.12, mouthMat);
    openMouth.scale.set(1, 0.8, 0.6);
    openMouth.position.set(0, -0.16, 0.82);
    openMouth.visible = false;
    creature.add(openMouth);

    // feet
    const makeFoot = (x: number) => {
      const f = sphere(0.2, darkMat);
      f.scale.set(1, 0.6, 1.2);
      f.position.set(x, -0.92, 0.25);
      creature.add(f);
      return f;
    };
    const footL = makeFoot(-0.32);
    const footR = makeFoot(0.32);

    // arms
    const makeArm = (x: number) => {
      const a = sphere(0.16, bodyMat);
      a.scale.set(0.7, 1.1, 0.7);
      a.position.set(x, -0.2, 0.3);
      creature.add(a);
      return a;
    };
    const armL = makeArm(-0.92);
    const armR = makeArm(0.92);

    // ears
    const makeEar = (x: number, dir: number) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 20), bodyMat);
      ear.position.set(x, 0.95, 0);
      ear.rotation.z = dir * 0.3;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 16), cheekMat);
      inner.position.set(0, -0.02, 0.06);
      ear.add(inner);
      creature.add(ear);
      return ear;
    };
    const earL = makeEar(-0.42, 1);
    const earR = makeEar(0.42, -1);

    // ── egg group (pre-hatch) ──────────────────────────────────
    const eggGroup = new THREE.Group();
    const eggMat = new THREE.MeshToonMaterial({ color: hexToColor(speciesMeta.body) });
    const egg = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 40), eggMat);
    egg.scale.set(0.78, 1.05, 0.78);
    eggGroup.add(egg);
    for (const [sx, sy, sz] of [[-0.3, 0.3, 0.6], [0.35, -0.1, 0.5], [0.1, 0.5, 0.4], [-0.2, -0.4, 0.55]] as const) {
      const spot = sphere(0.1, darkMat);
      spot.position.set(sx, sy, sz);
      eggGroup.add(spot);
    }
    root.add(eggGroup);

    // ── hat + companion groups ─────────────────────────────────
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 1.0, 0);
    creature.add(hatGroup);
    const companion = new THREE.Group();
    scene.add(companion);

    // ── ground shadow blob ─────────────────────────────────────
    const shadowTex = makeShadowTexture();
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.25;
    scene.add(shadow);

    // ── stars (added for dark scenes) ──────────────────────────
    let aurora: THREE.Group | null = null;
    const ensureAurora = (on: boolean) => {
      if (on && !aurora) {
        aurora = new THREE.Group();
        const cols = [0x5cffb0, 0x7c5cff, 0x4bd5ff];
        cols.forEach((col, i) => {
          const band = new THREE.Mesh(
            new THREE.PlaneGeometry(13, 1.5),
            new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }),
          );
          band.position.set(0, 2.6 - i * 0.7, -5);
          band.rotation.z = (i - 1) * 0.14;
          aurora!.add(band);
        });
        scene.add(aurora);
      } else if (!on && aurora) {
        scene.remove(aurora);
        aurora.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose();
          (m.material as THREE.Material | undefined)?.dispose?.();
        });
        aurora = null;
      }
    };

    let stars: THREE.Points | null = null;
    const ensureStars = (on: boolean) => {
      if (on && !stars) {
        const geo = new THREE.BufferGeometry();
        const n = 120;
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          pos[i * 3] = (Math.random() - 0.5) * 16;
          pos[i * 3 + 1] = Math.random() * 8 - 1;
          pos[i * 3 + 2] = -3 - Math.random() * 6;
        }
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08 }));
        scene.add(stars);
      } else if (!on && stars) {
        scene.remove(stars);
        stars.geometry.dispose();
        (stars.material as THREE.Material).dispose();
        stars = null;
      }
    };

    // ── particle sprites (hearts / sparkles) ───────────────────
    const heartTex = makeSpriteTexture("heart");
    const starTex = makeSpriteTexture("star");
    interface P { sprite: THREE.Sprite; vx: number; vy: number; vz: number; life: number; max: number; }
    const particles: P[] = [];
    const spawn = (kind: "heart" | "sparkle", count: number) => {
      for (let i = 0; i < count; i++) {
        const mat = new THREE.SpriteMaterial({
          map: kind === "heart" ? heartTex : starTex,
          transparent: true,
          depthWrite: false,
          color: kind === "heart" ? new THREE.Color().setHSL(0.92, 0.8, 0.7) : new THREE.Color().setHSL(Math.random(), 0.8, 0.7),
        });
        const sp = new THREE.Sprite(mat);
        const s = 0.3 + Math.random() * 0.25;
        sp.scale.set(s, s, s);
        sp.position.set((Math.random() - 0.5) * 0.8, 0.2 + Math.random() * 0.3, 0.6);
        scene.add(sp);
        const ang = Math.random() * Math.PI * 2;
        const sp2 = kind === "sparkle" ? 2.2 : 1.2;
        particles.push({
          sprite: sp,
          vx: Math.cos(ang) * (kind === "sparkle" ? sp2 : 0.4),
          vy: 1.4 + Math.random() * 1.2,
          vz: Math.sin(ang) * (kind === "sparkle" ? sp2 : 0.4),
          life: 0,
          max: 1.1 + Math.random() * 0.6,
        });
      }
    };

    // ── cosmetic builders (rebuilt only when equipped changes) ──
    let curHat: string | undefined = "__init__";
    let curCompanion: string | undefined = "__init__";
    let curBg: string | undefined = "__init__";

    const buildHat = (hat: string | undefined) => {
      hatGroup.clear();
      if (!hat) return;
      const gold = new THREE.MeshToonMaterial({ color: 0xffd34d });
      const pink = new THREE.MeshToonMaterial({ color: 0xff5c8a });
      const green = new THREE.MeshToonMaterial({ color: 0x7ed957 });
      const purple = new THREE.MeshToonMaterial({ color: 0x5b3fb0 });
      if (hat === "party") {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 24), pink);
        cone.position.y = 0.35;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), green);
        ball.position.y = 0.74;
        hatGroup.add(cone, ball);
      } else if (hat === "crown") {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.22, 24, 1, true), gold);
        band.position.y = 0.2;
        hatGroup.add(band);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 8), gold);
          spike.position.set(Math.cos(a) * 0.4, 0.36, Math.sin(a) * 0.4);
          hatGroup.add(spike);
        }
      } else if (hat === "bow") {
        for (const d of [-1, 1]) {
          const w = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 16), pink);
          w.rotation.z = d * Math.PI / 2;
          w.position.set(d * 0.22, 0.18, 0);
          hatGroup.add(w);
        }
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), gold);
        knot.position.y = 0.18;
        hatGroup.add(knot);
      } else if (hat === "leaf") {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), green);
        stem.position.y = 0.2;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), green);
        leaf.scale.set(1.6, 0.5, 0.9);
        leaf.position.set(0.14, 0.34, 0);
        leaf.rotation.z = -0.5;
        hatGroup.add(stem, leaf);
      } else if (hat === "wizard") {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.95, 24), purple);
        cone.position.y = 0.5;
        for (let i = 0; i < 4; i++) {
          const st = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), gold);
          st.position.set((Math.random() - 0.5) * 0.4, 0.25 + Math.random() * 0.5, 0.3);
          cone.add(st);
        }
        hatGroup.add(cone);
      } else if (hat === "halo") {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 12, 32), new THREE.MeshToonMaterial({ color: 0xffe27a, emissive: 0xffc14d, emissiveIntensity: 0.6 }));
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.4;
        hatGroup.add(halo);
      } else if (hat === "horns") {
        const red = new THREE.MeshToonMaterial({ color: 0xe0556b });
        for (const d of [-1, 1]) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 12), red);
          horn.position.set(d * 0.24, 0.28, 0);
          horn.rotation.z = d * -0.4;
          hatGroup.add(horn);
        }
      } else if (hat === "flower") {
        const cols = [0xff8fc4, 0xffd34d, 0xb388ff, 0x7ed957, 0xff8a5c];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshToonMaterial({ color: cols[i] }));
          petal.scale.set(1, 0.5, 1);
          petal.position.set(Math.cos(a) * 0.3, 0.12, Math.sin(a) * 0.3 + 0.15);
          hatGroup.add(petal);
        }
      }
    };

    const buildCompanion = (c: string | undefined) => {
      companion.clear();
      companion.visible = !!c;
      if (!c) return;
      if (c === "butterfly") {
        const body3 = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.2, 4, 8), new THREE.MeshToonMaterial({ color: 0x5b3fb0 }));
        companion.add(body3);
        for (const d of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshToonMaterial({ color: 0xff8fc4 }));
          wing.scale.set(0.6, 1, 0.1);
          wing.position.set(d * 0.18, 0, 0);
          wing.userData.dir = d;
          companion.add(wing);
        }
      } else if (c === "firefly" || c === "star") {
        const col = c === "firefly" ? 0xfff3a0 : 0xffe27a;
        const glow = new THREE.Mesh(new THREE.SphereGeometry(c === "star" ? 0.16 : 0.12, 16, 16), new THREE.MeshToonMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 }));
        companion.add(glow);
      } else if (c === "ghost") {
        const g = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20), new THREE.MeshToonMaterial({ color: 0xeef0ff, transparent: true, opacity: 0.85 }));
        g.scale.set(1, 1.2, 1);
        const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
        e1.position.set(-0.06, 0.02, 0.16);
        const e2 = e1.clone();
        e2.position.x = 0.06;
        g.add(e1, e2);
        companion.add(g);
      }
    };

    const setBackground = (bg: string | undefined) => {
      const key2 = bg && BG_GRADIENTS[bg] ? bg : "default";
      const [top, bottom] = BG_GRADIENTS[key2];
      scene.background = makeGradientTexture(top, bottom);
      const dark = key2 === "night" || key2 === "space" || key2 === "aurora";
      ensureStars(dark);
      ensureAurora(key2 === "aurora");
      hemi.intensity = dark ? 0.7 : 1.1;
      key.intensity = dark ? 0.9 : 1.4;
    };

    // ── per-frame state ────────────────────────────────────────
    let lastHeart = props.heartPulse;
    let lastSparkle = props.sparklePulse;
    const blink = { t: 2 + Math.random() * 2, closing: 0 };
    let raf = 0;
    const clock = new THREE.Clock();

    const setFeatureVisibility = (stage: EvolutionStage) => {
      const f = STAGE_FEATURES[stage];
      earL.visible = earR.visible = f.ears;
      armL.visible = armR.visible = f.arms;
      footL.visible = footR.visible = f.feet;
      const isEgg = stage === "egg";
      creature.visible = !isEgg;
      eggGroup.visible = isEgg;
    };

    const resize = () => {
      const w = mount.clientWidth || 320;
      const h = w; // square
      renderer.setSize(w, h, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const p = propsRef.current;
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;
      const rm = p.reducedMotion;

      // rebuild cosmetics on change
      if (p.equipped.hat !== curHat) { curHat = p.equipped.hat; buildHat(curHat); }
      if (p.equipped.companion !== curCompanion) { curCompanion = p.equipped.companion; buildCompanion(curCompanion); }
      if (p.equipped.background !== curBg) { curBg = p.equipped.background; setBackground(curBg); }

      // coat colour (rainbow animates)
      const baseMeta = SPECIES[p.species];
      let coat: THREE.Color;
      if (p.equipped.color === "rainbow") coat = new THREE.Color().setHSL((t * 0.12) % 1, 0.7, 0.66);
      else coat = hexToColor(p.equipped.color ?? baseMeta.body);
      // desaturate a neglected pet
      const dull = (1 - p.vitality) * 0.5;
      if (dull > 0.02) {
        const hsl = { h: 0, s: 0, l: 0 };
        coat.getHSL(hsl);
        coat.setHSL(hsl.h, hsl.s * (1 - dull), hsl.l);
      }
      bodyMat.color.copy(coat);
      eggMat.color.copy(coat);
      darkMat.color.copy(coat).multiplyScalar(0.8);
      bellyMat.color.copy(p.equipped.color ? coat.clone().lerp(new THREE.Color(0xffffff), 0.55) : hexToColor(baseMeta.belly));
      // sick tint
      bodyMat.emissive.setHex(p.mood === "sick" ? 0x2e5e2e : 0x000000);
      bodyMat.emissiveIntensity = p.mood === "sick" ? 0.35 : 0;

      // stage
      setFeatureVisibility(p.stage);
      const targetScale = STAGE_SCALE[p.stage];
      creature.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

      // mood-driven motion
      const moodSpeed = p.mood === "happy" ? 3.6 : p.mood === "sad" ? 1.1 : p.mood === "sleepy" ? 0.7 : 2;
      const bounceAmp = p.mood === "happy" ? 0.16 : p.mood === "content" ? 0.06 : 0.02;
      const bounce = rm || p.stage === "egg" ? 0 : Math.abs(Math.sin(t * moodSpeed)) * bounceAmp;
      root.position.y = bounce;
      const breathe = rm ? 1 : 1 + Math.sin(t * moodSpeed * 0.8) * 0.02;
      root.scale.setScalar(breathe);
      root.rotation.y = rm ? 0 : Math.sin(t * 0.5) * 0.18;
      root.rotation.z = p.mood === "sleepy" && !rm ? Math.sin(t * 1.1) * 0.06 : 0;
      shadow.scale.setScalar(1 - bounce);

      // egg wobble
      if (p.stage === "egg") eggGroup.rotation.z = rm ? 0 : Math.sin(t * 2) * 0.06;

      // expressions
      const sleepyLid = p.mood === "sleepy" || p.mood === "sick";
      // blink
      if (!rm) {
        blink.t -= dt;
        if (blink.closing > 0) blink.closing -= dt * 7;
        if (blink.t <= 0) { blink.closing = 1; blink.t = 2 + Math.random() * 3; }
      }
      const openTarget = (sleepyLid ? 0.45 : 1) * (1 - Math.max(0, blink.closing) * 0.9);
      for (const eye of [eyeL, eyeR]) eye.scale.y += (openTarget - eye.scale.y) * 0.4;
      lidL.visible = lidR.visible = sleepyLid;
      // pupils look down when sad/sick, gentle wander otherwise
      const pupY = p.mood === "sad" ? -0.05 : rm ? 0 : Math.sin(t * 0.8) * 0.03;
      (eyeL.userData.pupil as THREE.Mesh).position.y = pupY;
      (eyeR.userData.pupil as THREE.Mesh).position.y = pupY;

      // mouth
      const happy = p.mood === "happy";
      const frown = p.mood === "sad";
      openMouth.visible = happy;
      smile.visible = !happy;
      smile.rotation.z = frown ? 0 : Math.PI; // ∩ vs U
      smile.position.y = frown ? -0.02 : -0.12;
      const mouthScale = p.mood === "content" ? 0.8 : 1;
      smile.scale.setScalar(mouthScale);

      // cheeks
      const cheekOn = happy || p.mood === "content";
      cheekL.visible = cheekR.visible = cheekOn;
      (cheekMat as THREE.MeshToonMaterial).opacity = happy ? 0.9 : 0.5;

      // ear wiggle
      if (STAGE_FEATURES[p.stage].ears && !rm) {
        earL.rotation.z = 0.3 + Math.sin(t * 2.4) * 0.08;
        earR.rotation.z = -0.3 - Math.sin(t * 2.4) * 0.08;
      }
      // arm wave when happy
      if (STAGE_FEATURES[p.stage].arms) {
        armR.position.y = -0.2 + (happy && !rm ? Math.abs(Math.sin(t * 6)) * 0.25 : 0);
      }

      // companion orbit
      if (companion.visible) {
        const orbit = rm ? 0.6 : t;
        companion.position.set(Math.cos(orbit * 1.2) * 1.7, 0.6 + Math.sin(orbit * 1.6) * 0.4, Math.sin(orbit * 1.2) * 1.2 + 0.5);
        companion.lookAt(camera.position);
        if (curCompanion === "butterfly") {
          companion.children.forEach((ch) => {
            if (ch.userData.dir) ch.rotation.y = (ch.userData.dir as number) * Math.sin(t * 14) * 0.7;
          });
        }
      }

      // pulses → particles
      if (p.heartPulse !== lastHeart) { lastHeart = p.heartPulse; spawn("heart", 8); }
      if (p.sparklePulse !== lastSparkle) { lastSparkle = p.sparklePulse; spawn("sparkle", 20); }

      // update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life += dt;
        if (pt.life >= pt.max) {
          scene.remove(pt.sprite);
          (pt.sprite.material as THREE.Material).dispose();
          particles.splice(i, 1);
          continue;
        }
        pt.sprite.position.x += pt.vx * dt;
        pt.sprite.position.y += pt.vy * dt;
        pt.sprite.position.z += pt.vz * dt;
        pt.vy -= 1.4 * dt;
        (pt.sprite.material as THREE.SpriteMaterial).opacity = 1 - pt.life / pt.max;
      }

      // stars twinkle
      if (stars) stars.rotation.y = t * 0.01;
      // aurora drift
      if (aurora) {
        aurora.children.forEach((band, i) => {
          band.position.x = Math.sin(t * 0.35 + i) * 1.6;
          ((band as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.12 + (Math.sin(t * 0.8 + i) * 0.5 + 0.5) * 0.12;
        });
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    // pause when offscreen
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else { clock.getDelta(); raf = requestAnimationFrame(loop); }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mt) => mt.dispose());
        }
      });
      heartTex.dispose();
      starTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mountRef}
      className="pet-canvas pet-3d"
      style={{ width: "100%", maxWidth: 360, aspectRatio: "1 / 1", margin: "0 auto" }}
      role="img"
      aria-label={`Your 3D pet looks ${props.mood}`}
    />
  );
}

// ── texture helpers ──────────────────────────────────────────────

function makeGradientTexture(top: string, bottom: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 2;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeShadowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(40,20,70,0.4)");
  g.addColorStop(1, "rgba(40,20,70,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeSpriteTexture(kind: "heart" | "star"): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.translate(32, 32);
  if (kind === "heart") {
    const s = 22;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(s * 0.5, -s * 0.4, s * 1.1, s * 0.2, 0, s);
    ctx.bezierCurveTo(-s * 1.1, s * 0.2, -s * 0.5, -s * 0.4, 0, s * 0.3);
    ctx.fill();
  } else {
    const spikes = 5, outer = 26, inner = 11;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}
