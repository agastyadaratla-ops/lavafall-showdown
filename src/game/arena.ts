import * as THREE from "three";
import { ARENA_R, LAYOUT_SCALE, type HazardRamp, type MapDef } from "./maps";

export { ARENA_R } from "./maps";

export interface Geyser {
  x: number;
  z: number;
  t: number;
  period: number;
  /** 0 idle, 1 warning, 2 erupting */
  state: 0 | 1 | 2;
  ring: THREE.Mesh;
  column: THREE.Mesh;
  justErupted: boolean;
}

/** Bakes the flowing hazard surface (molten rock, tar, ...) from a per-channel ramp. */
function hazardTexture(ramp: HazardRamp, repeat: [number, number]): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const n =
        Math.sin(x * 0.18) * Math.cos(y * 0.21) +
        Math.sin((x + y) * 0.09) * 1.2 +
        Math.random() * 0.6;
      const v = (n + 2.4) / 4.6;
      const r = ramp.r[0] + v * ramp.r[1];
      const g = ramp.g[0] + v * ramp.g[1];
      const b = ramp.b[0] + v * ramp.b[1];
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  return t;
}

/** A fossil ribcage: spine plus rib arcs. Reads as cover at silhouette distance. */
function ribcage(mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.2, 6), mat);
  spine.rotation.z = Math.PI / 2;
  spine.position.y = 2.1;
  g.add(spine);
  for (let i = 0; i < 5; i++) {
    const s = 1.15 + Math.sin(i * 0.9) * 0.35;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(s, 0.12, 5, 12, Math.PI * 1.05), mat);
    rib.position.set(-2 + i * 1.1, 2.05, 0);
    rib.rotation.y = Math.PI / 2;
    rib.rotation.z = Math.PI;
    g.add(rib);
  }
  return g;
}

/** A single weathered long bone lying in the ferns. */
function longBone(mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.4, 6), mat);
  shaft.rotation.z = Math.PI / 2;
  g.add(shaft);
  for (const s of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 6), mat);
    knob.position.x = s * 1.7;
    g.add(knob);
  }
  g.position.y = 0.42;
  return g;
}

export class Arena {
  group = new THREE.Group();
  geysers: Geyser[] = [];
  readonly def: MapDef;
  /** scaled half-width of the hazard river */
  private half: number;
  private bridges: Array<[number, number]>;
  private hazardMat: THREE.MeshBasicMaterial;
  private hazardLights: THREE.PointLight[] = [];
  private time = 0;

  constructor(def: MapDef) {
    this.def = def;
    this.half = def.hazardHalf * LAYOUT_SCALE;
    this.bridges = def.bridges.map(
      ([a, b]) => [a * LAYOUT_SCALE, b * LAYOUT_SCALE] as [number, number],
    );
    const g = this.group;

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_R + 4, 56),
      new THREE.MeshLambertMaterial({ color: def.ground }),
    );
    ground.rotation.x = -Math.PI / 2;
    g.add(ground);

    // stained band flanking the hazard, for legibility
    const band = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_R * 2 + 8, this.half * 2 + 9),
      new THREE.MeshLambertMaterial({ color: def.band }),
    );
    band.rotation.x = -Math.PI / 2;
    band.position.y = 0.01;
    g.add(band);

    // hazard river. fog:false keeps it legible to the far rim of the crater
    this.hazardMat = new THREE.MeshBasicMaterial({
      map: hazardTexture(def.hazardRamp, def.hazardRepeat),
      fog: false,
      toneMapped: false,
    });
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_R * 2 + 8, this.half * 2),
      this.hazardMat,
    );
    river.rotation.x = -Math.PI / 2;
    river.position.y = def.hazardY;
    g.add(river);

    // banks
    for (const s of [-1, 1]) {
      const bank = new THREE.Mesh(
        new THREE.BoxGeometry(ARENA_R * 2 + 8, 0.5, 0.7),
        new THREE.MeshLambertMaterial({ color: def.bank }),
      );
      bank.position.set(0, 0.1, s * (this.half + 0.3));
      g.add(bank);
    }

    // crossings
    for (const [a, b] of this.bridges) {
      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(b - a, 0.35, this.half * 2 + 2),
        new THREE.MeshLambertMaterial({ color: def.bridge }),
      );
      bridge.position.set((a + b) / 2, 0.13, 0);
      g.add(bridge);
    }

    // rim wall
    const rimMat = new THREE.MeshLambertMaterial({ color: def.rim });
    const ringCount = Math.round(40 * LAYOUT_SCALE);
    for (let i = 0; i < ringCount; i++) {
      const a = (i / ringCount) * Math.PI * 2;
      const h = 4 + Math.random() * 4;
      const rock = new THREE.Mesh(new THREE.BoxGeometry(4 + Math.random() * 3, h, 3), rimMat);
      rock.position.set(Math.cos(a) * (ARENA_R + 1.6), h / 2 - 0.4, Math.sin(a) * (ARENA_R + 1.6));
      rock.rotation.y = a + Math.random() * 0.5;
      g.add(rock);
    }

    // scattered cover silhouettes
    const propMat = new THREE.MeshLambertMaterial({ color: def.propColor });
    for (let i = 0; i < Math.round(14 * LAYOUT_SCALE * LAYOUT_SCALE); i++) {
      const a = Math.random() * Math.PI * 2;
      const r = (9 + Math.random() * 20) * LAYOUT_SCALE;
      const z = Math.sin(a) * r;
      if (Math.abs(z) < this.half + 2) continue;
      const x = Math.cos(a) * r;
      if (def.props === "bones") {
        const prop = Math.random() < 0.45 ? ribcage(propMat) : longBone(propMat);
        prop.position.x = x;
        prop.position.z = z;
        prop.rotation.y = Math.random() * Math.PI * 2;
        g.add(prop);
      } else {
        const s = 1 + Math.random() * 1.8;
        const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), propMat);
        b.position.set(x, s * 0.4, z);
        b.rotation.set(Math.random(), Math.random(), Math.random());
        g.add(b);
      }
    }

    // vents
    const spots = def.vents.map(
      ([sx, sz]) => [sx * LAYOUT_SCALE, sz * LAYOUT_SCALE] as [number, number],
    );
    spots.forEach(([x, z], i) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 2.3, 24),
        new THREE.MeshBasicMaterial({
          color: def.ventRing,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.04, z);
      g.add(ring);
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(1.7, 2.1, 12, 14, 1, true),
        new THREE.MeshBasicMaterial({
          color: def.ventColumn,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
        }),
      );
      column.position.set(x, 6, z);
      column.visible = false;
      g.add(column);
      this.geysers.push({
        x,
        z,
        t: (i / spots.length) * 9,
        period: 8.5 + i * 0.4,
        state: 0,
        ring,
        column,
        justErupted: false,
      });
    });

    // lighting
    g.add(new THREE.HemisphereLight(def.hemiSky, def.hemiGround, def.hemiIntensity));
    const dir = new THREE.DirectionalLight(def.sunColor, def.sunIntensity);
    dir.position.set(-12, 20, 8);
    g.add(dir);
    for (const x of [-40, -20, 0, 20, 40]) {
      const l = new THREE.PointLight(
        def.hazardLight,
        def.hazardLightIntensity,
        34 * LAYOUT_SCALE,
        2,
      );
      l.position.set(x, 1.2, 0);
      g.add(l);
      this.hazardLights.push(l);
    }
  }

  /** Frees GPU resources for this arena so maps can be swapped without leaking. */
  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry?.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.hazardMat.map?.dispose();
  }

  /** true when the ground position is inside the hazard river (and off any crossing). */
  inLava(x: number, z: number) {
    if (Math.abs(z) > this.half) return false;
    for (const [a, b] of this.bridges) if (x > a && x < b) return false;
    return Math.abs(x) < ARENA_R + 3;
  }

  /** true when an active eruption column covers the position. */
  inEruption(x: number, z: number) {
    for (const gy of this.geysers) {
      if (gy.state !== 2) continue;
      const dx = x - gy.x;
      const dz = z - gy.z;
      if (dx * dx + dz * dz < 2.2 * 2.2) return true;
    }
    return false;
  }

  /** Position near the hazard edge - used to bait players into danger. */
  hazardSpot(rng = Math.random) {
    const side = rng() < 0.5 ? -1 : 1;
    const x = (rng() * 2 - 1) * (ARENA_R - 8);
    const z = side * (this.half + 1.2 + rng() * 3.5);
    return { x, z };
  }

  update(dt: number) {
    this.time += dt;
    const map = this.hazardMat.map;
    if (map) {
      map.offset.x -= dt * this.def.hazardDrift;
      map.offset.y += dt * this.def.hazardDrift * 0.34;
    }
    const base = this.def.hazardLightIntensity;
    const pulse = base * (1 + Math.sin(this.time * 2.3) * 0.2);
    for (let i = 0; i < this.hazardLights.length; i++) {
      this.hazardLights[i].intensity = pulse + Math.sin(this.time * 3 + i) * base * 0.15;
    }
    for (const gy of this.geysers) {
      gy.justErupted = false;
      gy.t += dt;
      if (gy.t > gy.period) gy.t -= gy.period;
      const warnAt = gy.period - 2.3;
      const eruptAt = gy.period - 1.1;
      const prev = gy.state;
      gy.state = gy.t > eruptAt ? 2 : gy.t > warnAt ? 1 : 0;
      if (gy.state === 2 && prev !== 2) gy.justErupted = true;
      gy.column.visible = gy.state === 2;
      if (gy.state === 2) {
        const k = (gy.t - eruptAt) / (gy.period - eruptAt);
        gy.column.scale.set(1, Math.min(1, 0.3 + k * 2), 1);
        (gy.column.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k * 0.4);
      }
      const mat = gy.ring.material as THREE.MeshBasicMaterial;
      mat.opacity =
        gy.state === 1 ? 0.35 + Math.abs(Math.sin(gy.t * 12)) * 0.5 : gy.state === 2 ? 0.9 : 0.18;
    }
  }
}
