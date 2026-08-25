import * as THREE from "three";

export const ARENA_R = 52;
/** Layout below was authored for a 34m crater; keep every proportion as the arena grows. */
const LAYOUT_SCALE = ARENA_R / 34;
/** Lava river runs along X; two basalt bridges cross it. */
export const LAVA_HALF = 4.2 * LAYOUT_SCALE;
const BRIDGES: Array<[number, number]> = (
  [
    [-17, -10],
    [10, 17],
  ] as Array<[number, number]>
).map(([a, b]) => [a * LAYOUT_SCALE, b * LAYOUT_SCALE] as [number, number]);

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

function lavaTexture(): THREE.Texture {
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
      const r = 235 + v * 20;
      const g = 70 + v * 165;
      const b = 15 + v * 55;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(15, 2);
  return t;
}

export class Arena {
  group = new THREE.Group();
  geysers: Geyser[] = [];
  private lavaMat: THREE.MeshBasicMaterial;
  private lavaLights: THREE.PointLight[] = [];
  private time = 0;

  constructor() {
    const g = this.group;

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_R + 4, 56),
      new THREE.MeshLambertMaterial({ color: 0x241d1c }),
    );
    ground.rotation.x = -Math.PI / 2;
    g.add(ground);

    // scorched ring near the lava for legibility
    const scorch = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_R * 2 + 8, LAVA_HALF * 2 + 9),
      new THREE.MeshLambertMaterial({ color: 0x2a1512 }),
    );
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.y = 0.01;
    g.add(scorch);

    // lava river (sunken)
    // fog:false keeps the river vivid all the way to the far rim of the bigger crater
    this.lavaMat = new THREE.MeshBasicMaterial({ map: lavaTexture(), fog: false, toneMapped: false });
    const lava = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_R * 2 + 8, LAVA_HALF * 2),
      this.lavaMat,
    );
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = -0.16;
    g.add(lava);

    // lava banks
    for (const s of [-1, 1]) {
      const bank = new THREE.Mesh(
        new THREE.BoxGeometry(ARENA_R * 2 + 8, 0.5, 0.7),
        new THREE.MeshLambertMaterial({ color: 0x0d0908 }),
      );
      bank.position.set(0, 0.1, s * (LAVA_HALF + 0.3));
      g.add(bank);
    }

    // bridges
    for (const [a, b] of BRIDGES) {
      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(b - a, 0.35, LAVA_HALF * 2 + 2),
        new THREE.MeshLambertMaterial({ color: 0x2e2724 }),
      );
      bridge.position.set((a + b) / 2, 0.13, 0);
      g.add(bridge);
    }

    // rock wall ring
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x1c1717 });
    const ringCount = Math.round(40 * LAYOUT_SCALE);
    for (let i = 0; i < ringCount; i++) {
      const a = (i / ringCount) * Math.PI * 2;
      const h = 4 + Math.random() * 4;
      const rock = new THREE.Mesh(new THREE.BoxGeometry(4 + Math.random() * 3, h, 3), rockMat);
      rock.position.set(Math.cos(a) * (ARENA_R + 1.6), h / 2 - 0.4, Math.sin(a) * (ARENA_R + 1.6));
      rock.rotation.y = a + Math.random() * 0.5;
      g.add(rock);
    }

    // scattered boulders for cover silhouettes
    for (let i = 0; i < Math.round(14 * LAYOUT_SCALE * LAYOUT_SCALE); i++) {
      const a = Math.random() * Math.PI * 2;
      const r = (9 + Math.random() * 20) * LAYOUT_SCALE;
      const z = Math.sin(a) * r;
      if (Math.abs(z) < LAVA_HALF + 2) continue;
      const s = 1 + Math.random() * 1.8;
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
      b.position.set(Math.cos(a) * r, s * 0.4, z);
      b.rotation.set(Math.random(), Math.random(), Math.random());
      g.add(b);
    }

    // geysers
    const rawSpots: Array<[number, number]> = [
      [-22, -13],
      [-8, 12],
      [7, -14],
      [21, 11],
      [-26, 14],
      [26, -10],
      [0, -20],
      [-2, 21],
    ];
    const spots = rawSpots.map(([sx, sz]) => [sx * LAYOUT_SCALE, sz * LAYOUT_SCALE] as [number, number]);
    spots.forEach(([x, z], i) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 2.3, 24),
        new THREE.MeshBasicMaterial({
          color: 0xff7a2a,
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
          color: 0xffb347,
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
    g.add(new THREE.HemisphereLight(0x8f7ea6, 0x4a3328, 1.55));
    const dir = new THREE.DirectionalLight(0xffd2ac, 0.85);
    dir.position.set(-12, 20, 8);
    g.add(dir);
    for (const x of [-40, -20, 0, 20, 40]) {
      const l = new THREE.PointLight(0xff5b18, 2.4, 34 * LAYOUT_SCALE, 2);
      l.position.set(x, 1.2, 0);
      g.add(l);
      this.lavaLights.push(l);
    }
  }

  /** true when the ground position is molten (river, no bridge). */
  inLava(x: number, z: number) {
    if (Math.abs(z) > LAVA_HALF) return false;
    for (const [a, b] of BRIDGES) if (x > a && x < b) return false;
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

  /** Position near the lava edge — used to bait players into danger. */
  hazardSpot(rng = Math.random) {
    const side = rng() < 0.5 ? -1 : 1;
    const x = (rng() * 2 - 1) * (ARENA_R - 8);
    const z = side * (LAVA_HALF + 1.2 + rng() * 3.5);
    return { x, z };
  }

  update(dt: number) {
    this.time += dt;
    const map = this.lavaMat.map;
    if (map) {
      map.offset.x -= dt * 0.035;
      map.offset.y += dt * 0.012;
    }
    const pulse = 2.1 + Math.sin(this.time * 2.3) * 0.5;
    for (let i = 0; i < this.lavaLights.length; i++) {
      this.lavaLights[i].intensity = pulse + Math.sin(this.time * 3 + i) * 0.35;
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
