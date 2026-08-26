import * as THREE from "three";
import { Arena, ARENA_R } from "./arena";
import { getMap, type MapDef } from "./maps";
import { Sfx } from "./audio";
import { BUFFS, UPGRADES } from "./upgrades";
import type { BuffCard, EnemyKind, HudState, Phase, ShopItem, Toast } from "./types";


interface Enemy {
  kind: EnemyKind;
  mesh: THREE.Group;
  mats: THREE.MeshLambertMaterial[];
  baseColor: number;
  hp: number;
  maxHp: number;
  radius: number;
  height: number;
  speed: number;
  damage: number;
  attackCd: number;
  stun: number;
  stunMax: number;
  downTimer: number;
  flash: number;
  chargeState: 0 | 1 | 2 | 3; // 0 idle, 1 telegraph, 2 charging, 3 recover
  chargeTimer: number;
  chargeDir: THREE.Vector2;
  chargeCd: number;
  shootCd: number;
  flank: number;
  vx: number;
  vz: number;
  alive: boolean;
  corpse: number;
  bob: number;
}

interface Pickup {
  kind: "ammo" | "med" | "slag";
  mesh: THREE.Mesh;
  life: number;
}

interface Projectile {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

const bestKey = (mapId: string) =>
  mapId === "deadlands" ? "deadlands.bestWave" : `deadlands.bestWave.${mapId}`;
const MAX_ALIVE = 34;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private mapDef: MapDef = getMap("deadlands");
  private arena = new Arena(this.mapDef);
  private dome: THREE.Mesh;
  private sfx = new Sfx();
  private canvas: HTMLCanvasElement;
  private onState: (s: HudState) => void;
  private raf = 0;
  private last = 0;
  private disposed = false;

  // ---- player
  private pos = new THREE.Vector3(0, 1.7, 18);
  private vel = new THREE.Vector3();
  private yaw = Math.PI;
  private pitch = 0;
  private hp = 100;
  private maxHp = 100;
  private stamina = 100;
  private maxStamina = 100;
  private slag = 0;
  private kills = 0;
  private combo = 0;
  private comboTimer = 0;
  private weapon: "rifle" | "machete" = "rifle";
  private mag = 30;
  private magSize = 30;
  private reserve = 150;
  private reserveMax = 240;
  private reloadT = 0;
  private fireCd = 0;
  private swingT = 0;
  private swingHit = false;
  private dodgeT = 0;
  private dodgeCd = 0;
  private dodgeDir = new THREE.Vector2();
  private tackleT = 0;
  private tackleCd = 0;
  private tackleDir = new THREE.Vector2();
  private tackleHits = new Set<Enemy>();
  private downed = false;
  private bleed = 0;
  private reviveT = 0;
  private adrenaline = 1;
  private lavaTick = 0;
  private hurtCd = 0;
  /** bearing of the last hit relative to view, and its fade timer */
  private hurtFromAng: number | null = null;
  private hurtFromT = 0;

  // upgrades / buffs
  private levels: Record<string, number> = {};
  private buffs = new Set<string>();

  // ---- waves
  private phase: Phase = "title";
  private wave = 0;
  private bestWave = 0;
  private spawnQueue: EnemyKind[] = [];
  private spawnTimer = 0;
  private waveTotal = 0;
  private respiteLeft = 0;
  private draft: BuffCard[] = [];

  private enemies: Enemy[] = [];
  private pickups: Pickup[] = [];
  private projectiles: Projectile[] = [];
  private toasts: Toast[] = [];
  private toastId = 1;

  // feedback
  private shake = 0;
  private hitFlash = 0;
  private damageFlash = 0;
  private hitStop = 0;
  private recoil = 0;
  private bobT = 0;
  private muzzle: THREE.PointLight;
  private viewmodel = new THREE.Group();
  private rifleModel = new THREE.Group();
  private macheteModel = new THREE.Group();
  private tracers: THREE.Line[] = [];
  private particles: {
    points: THREE.Points;
    pos: Float32Array;
    col: Float32Array;
    vel: Float32Array;
    life: Float32Array;
    n: number;
    cursor: number;
  };

  // input
  private keys: Record<string, boolean> = {};
  private mouseDown = false;
  private locked = false;
  /** true while the game wants the pointer captured (drives retry after the browser cooldown) */
  private wantLock = false;
  private lockRetry = 0;
  private lockTries = 0;
  private hudTimer = 0;

  constructor(canvas: HTMLCanvasElement, onState: (s: HudState) => void) {
    this.canvas = canvas;
    this.onState = onState;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.05, 340);
    this.scene.add(this.arena.group);

    // sky dome - recoloured per map by applyTheme()
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(200, 20, 12),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false }),
    );
    this.scene.add(this.dome);
    this.applyTheme();

    this.muzzle = new THREE.PointLight(0xffcc88, 0, 14, 2);
    this.scene.add(this.muzzle);

    this.buildViewmodel();
    this.camera.add(this.viewmodel);
    this.scene.add(this.camera);

    // tracer pool
    for (let i = 0; i < 10; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0 }),
      );
      line.frustumCulled = false;
      this.scene.add(line);
      this.tracers.push(line);
    }

    // particle pool
    const n = 600;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.95 }),
    );
    points.frustumCulled = false;
    this.scene.add(points);
    this.particles = { points, pos, col, vel: new Float32Array(n * 3), life: new Float32Array(n), n, cursor: 0 };
    for (let i = 0; i < n; i++) pos[i * 3 + 1] = -999;

    this.bestWave = Number(localStorage.getItem(bestKey(this.mapDef.id)) || 0);

    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("wheel", this.onWheel, { passive: true });
    document.addEventListener("pointerlockchange", this.onLockChange);
    document.addEventListener("pointerlockerror", this.onLockError);

    this.pushState();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------------------------------------------------------------- lifecycle
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("wheel", this.onWheel);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    document.removeEventListener("pointerlockerror", this.onLockError);
    window.clearTimeout(this.lockRetry);
    this.wantLock = false;
    this.renderer.dispose();
  }

  private onResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  };

  // ---------------------------------------------------------------- commands
  /** Background, fog and sky colour for the active map. */
  private applyTheme() {
    const d = this.mapDef;
    this.scene.background = new THREE.Color(d.background);
    // fog stays far out so enemies read at range across the wide crater
    this.scene.fog = new THREE.Fog(d.fogColor, d.fogNear, d.fogFar);
    (this.dome.material as THREE.MeshBasicMaterial).color.setHex(d.domeColor);
  }

  /** Swap the arena. Safe to call from the title screen between runs. */
  setMap(id: string) {
    if (id === this.mapDef.id) return;
    this.mapDef = getMap(id);
    this.scene.remove(this.arena.group);
    this.arena.dispose();
    this.arena = new Arena(this.mapDef);
    this.scene.add(this.arena.group);
    this.applyTheme();
    this.bestWave = Number(localStorage.getItem(bestKey(this.mapDef.id)) || 0);
    this.pushState();
  }

  startRun(mapId?: string) {
    if (mapId) this.setMap(mapId);
    this.sfx.resume();
    this.resetRun();
    this.phase = "playing";
    this.startWave(1);
    this.lock();
    this.pushState();
  }

  restart() {
    this.startRun();
  }

  togglePause() {
    if (this.phase === "playing") {
      this.phase = "paused";
      this.releaseLock();
    } else if (this.phase === "paused") {
      this.phase = "playing";
      this.lock();
    }
    this.pushState();
  }

  resume() {
    if (this.phase === "paused") this.togglePause();
  }

  lock() {
    if (this.disposed) return;
    if (document.pointerLockElement === this.canvas) {
      this.locked = true;
      return;
    }
    this.wantLock = true;
    this.lockTries = 0;
    this.requestLock();
  }

  /** release the pointer and stop any pending re-lock attempts */
  private releaseLock() {
    this.wantLock = false;
    window.clearTimeout(this.lockRetry);
    document.exitPointerLock?.();
  }

  /** phases that expect the mouse to be captured */
  private needsPointer() {
    return this.phase === "playing";
  }

  private requestLock() {
    if (this.disposed || document.pointerLockElement === this.canvas) return;
    let p: unknown;
    try {
      p = this.canvas.requestPointerLock?.();
    } catch {
      p = undefined;
    }
    // Chrome rejects if called inside the ~1.25s cooldown after exitPointerLock,
    // or without user activation. Both are recoverable, so retry once the gate lifts.
    if (p && typeof (p as Promise<void>).then === "function") {
      (p as Promise<void>).then(
        () => {
          this.locked = document.pointerLockElement === this.canvas;
        },
        () => this.scheduleLockRetry(),
      );
    }
  }

  private scheduleLockRetry() {
    // browsers only grant the pointer off a user gesture, so give the cooldown a couple of
    // tries and then fall back to click-to-recapture rather than spinning forever
    if (this.lockTries >= 2) {
      // the browser will not grant the pointer without a fresh gesture, so hand the player
      // the normal pause menu - its Resume button is a real click and always succeeds
      this.wantLock = false;
      if (this.phase === "playing") this.phase = "paused";
      this.pushState();
      return;
    }
    this.lockTries++;
    window.clearTimeout(this.lockRetry);
    this.lockRetry = window.setTimeout(() => {
      if (this.wantLock && !this.disposed && this.needsPointer()) this.requestLock();
    }, 1400);
  }

  buy(id: string) {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return;
    const lvl = this.levels[id] ?? 0;
    if (lvl >= def.maxLevel) return;
    const cost = def.baseCost + def.costStep * lvl;
    if (this.slag < cost) {
      this.toast("Not enough slag", "bad");
      return;
    }
    this.slag -= cost;
    this.levels[id] = lvl + 1;
    this.applyUpgrade(id);
    this.sfx.play("buff");
    this.toast(`${def.name} acquired`, "good");
    this.pushState();
  }

  chooseBuff(id: string) {
    if (this.phase !== "draft") return;
    const card = this.draft.find((c) => c.id === id);
    if (!card) return;
    this.buffs.add(id);
    if (id === "stamina") this.maxStamina += 20;
    this.draft = [];
    this.sfx.play("buff");
    this.toast(`${card.name} gained`, "good");
    this.beginRespite();
  }

  skipRespite() {
    if (this.phase !== "respite") return;
    this.respiteLeft = 0;
  }

  // ---------------------------------------------------------------- run setup
  private resetRun() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
    for (const p of this.pickups) this.scene.remove(p.mesh);
    this.pickups = [];
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    this.levels = {};
    this.buffs.clear();
    this.maxHp = 100;
    this.hp = 100;
    this.maxStamina = 100;
    this.stamina = 100;
    this.slag = 0;
    this.kills = 0;
    this.combo = 0;
    this.magSize = 30;
    this.mag = 30;
    this.reserve = 150;
    this.adrenaline = 1;
    this.downed = false;
    this.bleed = 0;
    this.reviveT = 0;
    this.weapon = "rifle";
    this.pos.set(0, 1.7, 18);
    this.vel.set(0, 0, 0);
    this.yaw = Math.PI;
    this.pitch = 0;
    this.wave = 0;
    this.toasts = [];
  }

  private applyUpgrade(id: string) {
    switch (id) {
      case "mag":
        this.magSize += 10;
        this.mag = this.magSize;
        break;
      case "armor":
        this.maxHp += 25;
        this.hp = this.maxHp;
        break;
      case "stamina":
        this.maxStamina += 20;
        this.stamina = this.maxStamina;
        break;
      case "ammo":
        this.reserve = this.reserveMax;
        break;
      case "adrenaline":
        this.adrenaline += 1;
        break;
    }
  }

  private lvl(id: string) {
    return this.levels[id] ?? 0;
  }

  private startWave(w: number) {
    this.wave = w;
    this.spawnQueue = [];
    const count = Math.min(60, 6 + Math.round(w * 2.2));
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      let kind: EnemyKind = "harasser";
      if (w >= 3 && r < Math.min(0.28, 0.06 + w * 0.02)) kind = "heavy";
      else if (w >= 2 && r < Math.min(0.55, 0.2 + w * 0.02)) kind = "spitter";
      this.spawnQueue.push(kind);
    }
    this.waveTotal = count;
    this.spawnTimer = 0.6;
    this.phase = "playing";
    this.sfx.play("wave");
    this.toast(`Wave ${w}`, "info");
    // bait pickups near the lava
    for (let i = 0; i < 2 + (w % 3 === 0 ? 2 : 0); i++) this.spawnPickup();
    // a wave can start straight off the respite timer, where the pointer was released
    this.lock();
  }

  private beginRespite() {
    this.phase = "respite";
    this.respiteLeft = 22;
    this.releaseLock();
    for (let i = 0; i < 3; i++) this.spawnPickup();
    this.pushState();
  }

  private completeWave() {
    const bonus = 40 + this.wave * 18;
    this.addSlag(bonus);
    this.toast(`Wave ${this.wave} cleared  +${bonus} slag`, "good");
    if (this.wave > this.bestWave) {
      this.bestWave = this.wave;
      localStorage.setItem(bestKey(this.mapDef.id), String(this.bestWave));
    }
    if (this.wave % 3 === 0) {
      const pool = BUFFS.filter((b) => !this.buffs.has(b.id));
      this.draft = pool.sort(() => Math.random() - 0.5).slice(0, 3);
      if (this.draft.length) {
        this.phase = "draft";
        this.releaseLock();
        this.pushState();
        return;
      }
    }
    this.beginRespite();
  }

  // ---------------------------------------------------------------- input
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Tab") e.preventDefault();
    if (this.keys[e.code]) return;
    this.keys[e.code] = true;
    if (e.code === "Escape") {
      if (this.phase === "playing" || this.phase === "paused") this.togglePause();
      return;
    }
    if (this.phase !== "playing" && this.phase !== "respite") return;
    if (e.code === "Digit1") this.weapon = "rifle";
    if (e.code === "Digit2") this.weapon = "machete";
    if (e.code === "KeyQ") this.weapon = this.weapon === "rifle" ? "machete" : "rifle";
    if (e.code === "KeyR") this.startReload();
    if (e.code === "Space") {
      e.preventDefault();
      this.tryDodge();
    }
    if (e.code === "KeyF" || e.code === "ShiftLeft") {
      if (e.code === "KeyF") this.tryTackle();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    const s = 0.0022;
    this.yaw -= e.movementX * s;
    this.pitch -= e.movementY * s;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
  };

  private onMouseDown = (e: MouseEvent) => {
    // clicking the arena re-captures the mouse; swallow that click so it does not also fire
    if (!this.locked && this.needsPointer() && e.target === this.canvas) {
      this.lock();
      return;
    }
    if (e.button === 0) this.mouseDown = true;
    if (e.button === 2) {
      this.weapon = "machete";
      this.trySwing();
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false;
  };

  private onWheel = () => {
    this.weapon = this.weapon === "rifle" ? "machete" : "rifle";
  };

  private onLockChange = () => {
    this.locked = document.pointerLockElement === this.canvas;
    if (this.locked) {
      window.clearTimeout(this.lockRetry);
      this.lockTries = 0;
      this.pushState();
      return;
    }
    if (this.phase === "playing") {
      this.phase = "paused";
      this.releaseLock();
      this.pushState();
    }
  };

  private onLockError = () => {
    this.locked = false;
    if (this.wantLock && this.needsPointer()) this.scheduleLockRetry();
  };

  // ---------------------------------------------------------------- viewmodel
  private buildViewmodel() {
    const metal = new THREE.MeshLambertMaterial({ color: 0x2c2c30 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x171719 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.75), metal);
    body.position.set(0, -0.02, -0.35);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.82);
    const magm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.14), dark);
    magm.position.set(0, -0.18, -0.28);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.3), dark);
    stock.position.set(0, -0.05, 0.12);
    this.rifleModel.add(body, barrel, magm, stock);
    this.rifleModel.position.set(0.28, -0.26, -0.15);

    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.5, 0.11),
      new THREE.MeshLambertMaterial({ color: 0xb9c0c6 }),
    );
    blade.position.set(0, 0.28, -0.2);
    blade.rotation.x = -0.5;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.08), dark);
    this.macheteModel.add(blade, grip);
    this.macheteModel.position.set(0.34, -0.34, -0.35);
    this.macheteModel.rotation.z = -0.25;
    this.macheteModel.visible = false;

    this.viewmodel.add(this.rifleModel, this.macheteModel);
  }

  // ---------------------------------------------------------------- combat
  private startReload() {
    if (this.weapon !== "rifle" || this.reloadT > 0) return;
    if (this.mag >= this.magSize || this.reserve <= 0) return;
    this.reloadT = Math.max(0.55, 1.7 * Math.pow(0.85, this.lvl("reload")));
    this.sfx.play("reload");
  }

  private fireRifle() {
    if (this.reloadT > 0 || this.fireCd > 0 || this.downed || this.tackleT > 0) return;
    if (this.mag <= 0) {
      this.sfx.play("dry");
      this.fireCd = 0.25;
      this.startReload();
      return;
    }
    this.mag--;
    this.fireCd = 0.115 * Math.pow(0.89, this.lvl("rof"));
    this.sfx.play("shot");
    this.recoil = 1;
    this.shake = Math.min(1, this.shake + 0.16);
    this.muzzle.intensity = 5;
    this.muzzle.position.copy(this.pos);

    const dir = this.lookDir();
    const spread = (this.isSprinting() ? 0.035 : 0.011) + (this.mouseDown ? 0.006 : 0);
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    const dmgBase = 18 + 6 * this.lvl("damage");
    let hitPoint: THREE.Vector3 | null = null;
    let target: Enemy | null = null;
    let bestT = 120;
    const rel = new THREE.Vector3();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      rel.set(e.mesh.position.x - this.pos.x, e.mesh.position.y + e.height * 0.5 - this.pos.y, e.mesh.position.z - this.pos.z);
      const t = rel.dot(dir);
      if (t < 0 || t > bestT) continue;
      const perp = rel.clone().addScaledVector(dir, -t).length();
      if (perp > e.radius + 0.25) continue;
      bestT = t;
      target = e;
    }
    if (target) {
      hitPoint = this.pos.clone().addScaledVector(dir, bestT);
      const headY = target.mesh.position.y + target.height * 0.82;
      let dmg = dmgBase;
      let crit = hitPoint.y > headY;
      if (this.buffs.has("hollowpoint") && Math.random() < 0.2) crit = true;
      if (crit) dmg *= 3;
      this.damageEnemy(target, dmg, 12 + this.lvl("machete") * 2, dir, crit);
    } else {
      hitPoint = this.pos.clone().addScaledVector(dir, 60);
    }
    this.tracer(this.pos.clone().addScaledVector(dir, 1.2), hitPoint);
    if (this.mag === 0) this.startReload();
  }

  private trySwing() {
    if (this.swingT > 0 || this.downed || this.tackleT > 0) return;
    this.swingT = 0.42;
    this.swingHit = false;
    this.sfx.play("swing");
  }

  private meleeHits() {
    const dir = this.lookDir();
    const dmg = (34 + 10 * this.lvl("machete")) * (this.buffs.has("juggernaut") ? 1 : 1);
    let any = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.mesh.position.x - this.pos.x;
      const dz = e.mesh.position.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 3.0 + e.radius) continue;
      const dot = (dx / d) * dir.x + (dz / d) * dir.z;
      if (dot < 0.55) continue;
      const stun = (26 + 4 * this.lvl("machete")) * (this.buffs.has("concussor") ? 1.5 : 1);
      this.damageEnemy(e, dmg, stun, new THREE.Vector3(dx / d, 0, dz / d), false, "melee");
      any = true;
    }
    if (any) {
      this.shake = Math.min(1, this.shake + 0.22);
      this.hitStop = 0.045;
      this.sfx.play("melee_hit");
    }
  }

  private tryDodge() {
    if (this.downed || this.dodgeCd > 0 || this.tackleT > 0) return;
    const cost = this.buffs.has("featherfoot") ? 15 : 25;
    if (this.stamina < cost) return;
    const m = this.moveInput();
    const dir = m.lengthSq() > 0 ? m : new THREE.Vector2(-Math.sin(this.yaw), -Math.cos(this.yaw));
    this.dodgeDir.copy(dir).normalize();
    this.dodgeT = this.buffs.has("featherfoot") ? 0.42 : 0.32;
    this.dodgeCd = 0.75;
    this.stamina -= cost;
    this.sfx.play("dodge");
  }

  private tryTackle() {
    if (this.downed || this.tackleCd > 0 || this.tackleT > 0) return;
    if (!this.isSprinting()) {
      this.toast("Tackle needs a sprint", "bad");
      return;
    }
    if (this.stamina < 30) return;
    this.stamina -= 30;
    this.tackleT = 0.4;
    this.tackleCd = 1.4;
    this.tackleHits.clear();
    const d = this.lookDir();
    this.tackleDir.set(d.x, d.z).normalize();
    this.sfx.play("tackle");
    this.shake = Math.min(1, this.shake + 0.3);
  }

  private damageEnemy(
    e: Enemy,
    amount: number,
    stun: number,
    dir: THREE.Vector3,
    crit: boolean,
    source: "gun" | "melee" | "tackle" = "gun",
  ) {
    if (!e.alive) return;
    let dmg = amount;
    if (e.downTimer > 0) {
      dmg *= source === "melee" || source === "tackle" ? 2.5 : 1.6;
      if (this.buffs.has("executioner")) dmg *= 2.2;
    }
    if (source === "tackle" && this.buffs.has("juggernaut")) dmg *= 2;
    e.hp -= dmg;
    e.flash = 0.12;
    this.hitFlash = crit ? 1 : 0.7;
    this.sfx.play("hitmark");
    this.blood(e.mesh.position.x, e.mesh.position.y + e.height * 0.6, e.mesh.position.z, crit ? 14 : 7);
    const kb = source === "tackle" ? 16 : source === "melee" ? 4.5 : 1.4;
    e.vx += dir.x * kb;
    e.vz += dir.z * kb;
    if (stun > 0 && e.downTimer <= 0) {
      e.stun += this.buffs.has("concussor") && source !== "melee" ? stun * 1.5 : stun;
      if (e.stun >= e.stunMax) {
        e.stun = 0;
        e.downTimer = e.kind === "heavy" ? 2.6 : 1.8;
        e.chargeState = 0;
        e.mesh.rotation.z = 1.2;
        this.sfx.play("stagger");
        this.toast("Staggered!", "info");
      }
    }
    if (e.hp <= 0) this.killEnemy(e, source);
  }

  private killEnemy(e: Enemy, source: "gun" | "melee" | "tackle" | "lava" | "geyser") {
    if (!e.alive) return;
    e.alive = false;
    e.corpse = 1.1;
    e.mesh.rotation.z = Math.PI / 2.2;
    // environmental deaths never count as kills, however the enemy ended up there
    const hazard = source === "lava" || source === "geyser";
    if (!hazard) this.kills++;
    this.combo++;
    this.comboTimer = 3;
    this.sfx.play("kill");
    this.blood(e.mesh.position.x, e.mesh.position.y + 0.6, e.mesh.position.z, 16);
    let reward = 8 + this.wave * 2 + (e.kind === "heavy" ? 20 : e.kind === "spitter" ? 6 : 0);
    if (source === "lava" || source === "geyser") {
      reward += 25;
      const where = source === "lava" ? "Lava" : "Geyser";
      this.toast(`${where} took one — no kill credit (+bonus slag)`, "info");
      this.fireBurst(e.mesh.position.x, e.mesh.position.z);
      if (this.buffs.has("wildfire")) {
        for (const o of this.enemies) {
          if (!o.alive || o === e) continue;
          const d = Math.hypot(o.mesh.position.x - e.mesh.position.x, o.mesh.position.z - e.mesh.position.z);
          if (d < 5) this.damageEnemy(o, 60, 0, new THREE.Vector3(0, 0, 0), false);
        }
      }
    }
    if (source === "melee" && this.buffs.has("bloodletter")) this.heal(12);
    if (this.buffs.has("secondwind") && this.combo % 3 === 0) this.stamina = this.maxStamina;
    if (this.buffs.has("scavenger") && Math.random() < 0.25) {
      this.spawnPickupAt("ammo", e.mesh.position.x, e.mesh.position.z);
    }
    this.addSlag(reward);
    if (this.combo >= 3 && this.combo % 3 === 0) this.toast(`${this.combo}x streak`, "good");
  }

  private addSlag(v: number) {
    this.slag += Math.round(v * (this.buffs.has("prospector") ? 1.5 : 1));
  }

  private heal(v: number) {
    this.hp = Math.min(this.maxHp, this.hp + v);
  }

  private hurt(v: number, kind: "hit" | "burn" = "hit", sx?: number, sz?: number) {
    if (this.downed) return;
    if (kind === "burn" && this.buffs.has("furnaceborn")) v *= 0.4;
    if (this.dodgeT > 0) return; // i-frames
    this.hp -= v;
    if (sx !== undefined && sz !== undefined) {
      // bearing relative to where the player is looking, so the HUD can point at the attacker
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      const dx = sx - this.pos.x;
      const dz = sz - this.pos.z;
      this.hurtFromAng = Math.atan2(dx * -fz + dz * fx, dx * fx + dz * fz);
    } else {
      this.hurtFromAng = null;
    }
    this.hurtFromT = 1;
    this.damageFlash = 1;
    this.shake = Math.min(1.2, this.shake + 0.25);
    if (this.hurtCd <= 0) {
      this.sfx.play(kind === "burn" ? "lava" : "hurt");
      this.hurtCd = 0.18;
    }
    if (this.hp <= 0) this.goDown();
  }

  private goDown() {
    this.hp = 0;
    this.downed = true;
    this.bleed = 22;
    this.reviveT = 0;
    this.sfx.play("down");
    this.toast(
      this.adrenaline > 0 ? "DOWNED — hold E to inject adrenaline" : "DOWNED — no adrenaline left",
      "bad",
    );
  }

  private gameOver() {
    this.phase = "gameover";
    if (this.wave > this.bestWave) {
      this.bestWave = this.wave;
      localStorage.setItem(bestKey(this.mapDef.id), String(this.bestWave));
    }
    this.releaseLock();
    this.pushState();
  }

  // ---------------------------------------------------------------- enemies
  private makeEnemy(kind: EnemyKind): Enemy {
    const group = new THREE.Group();
    const mats: THREE.MeshLambertMaterial[] = [];
    const color = this.mapDef.enemyTint[kind];
    // a low self-lit floor keeps silhouettes readable against the dark crater
    const skin = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.22 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x5a4038 });
    mats.push(skin, dark);
    // flash + charge tints overwrite emissive, so record the resting value to restore
    for (const mat of mats) mat.userData.baseEmissive = mat.emissive.getHex();
    const scale = kind === "heavy" ? 1.55 : kind === "spitter" ? 1.0 : 0.95;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.95, 0.45), skin);
    torso.position.y = 1.1;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), skin);
    head.position.y = 1.78;
    const eye = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.06, 0.04),
      new THREE.MeshBasicMaterial({ color: kind === "spitter" ? 0x9dff5a : 0xff4020 }),
    );
    eye.position.set(0, 1.82, -0.19);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.22), dark);
    legL.position.set(-0.19, 0.32, 0);
    const legR = legL.clone();
    legR.position.x = 0.19;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.18), skin);
    armL.position.set(-0.46, 1.15, -0.1);
    armL.rotation.x = -0.7;
    const armR = armL.clone();
    armR.position.x = 0.46;
    group.add(torso, head, eye, legL, legR, armL, armR);
    group.scale.setScalar(scale);
    group.userData.legs = [legL, legR];
    group.userData.arms = [armL, armR];

    const base: Record<EnemyKind, Partial<Enemy>> = {
      harasser: { hp: 46, speed: 4.7, damage: 9, radius: 0.5, stunMax: 55 },
      heavy: { hp: 240, speed: 2.1, damage: 28, radius: 0.95, stunMax: 130 },
      spitter: { hp: 72, speed: 2.7, damage: 13, radius: 0.55, stunMax: 55 },
    };
    const b = base[kind];
    const hpMul = 1 + 0.13 * (this.wave - 1);
    const hp = Math.round((b.hp as number) * hpMul);
    return {
      kind,
      mesh: group,
      mats,
      baseColor: color,
      hp,
      maxHp: hp,
      radius: b.radius as number,
      height: 2 * scale,
      speed: (b.speed as number) * (1 + Math.min(0.35, this.wave * 0.015)),
      damage: (b.damage as number) * (1 + 0.06 * (this.wave - 1)),
      attackCd: 0,
      stun: 0,
      stunMax: b.stunMax as number,
      downTimer: 0,
      flash: 0,
      chargeState: 0,
      chargeTimer: 0,
      chargeDir: new THREE.Vector2(),
      chargeCd: 2 + Math.random() * 3,
      shootCd: 1 + Math.random() * 2,
      flank: Math.random() < 0.5 ? -1 : 1,
      vx: 0,
      vz: 0,
      alive: true,
      corpse: 0,
      bob: Math.random() * 6,
    };
  }

  private spawnEnemy(kind: EnemyKind) {
    const e = this.makeEnemy(kind);
    let a = Math.random() * Math.PI * 2;
    let x = Math.cos(a) * (ARENA_R - 2);
    let z = Math.sin(a) * (ARENA_R - 2);
    let guard = 0;
    while (this.arena.inLava(x, z) && guard++ < 12) {
      a = Math.random() * Math.PI * 2;
      x = Math.cos(a) * (ARENA_R - 2);
      z = Math.sin(a) * (ARENA_R - 2);
    }
    e.mesh.position.set(x, 0, z);
    this.scene.add(e.mesh);
    this.enemies.push(e);
  }

  // ---------------------------------------------------------------- pickups
  private spawnPickup() {
    const roll = Math.random();
    const kind: Pickup["kind"] = roll < 0.45 ? "ammo" : roll < 0.8 ? "med" : "slag";
    const s = this.arena.hazardSpot();
    this.spawnPickupAt(kind, s.x, s.z);
  }

  private spawnPickupAt(kind: Pickup["kind"], x: number, z: number) {
    const color = kind === "ammo" ? 0xf0c860 : kind === "med" ? 0x4ce07a : 0xc06cff;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.5 }),
    );
    mesh.position.set(x, 0.6, z);
    this.scene.add(mesh);
    this.pickups.push({ kind, mesh, life: 60 });
  }

  // ---------------------------------------------------------------- fx
  private tracer(from: THREE.Vector3, to: THREE.Vector3) {
    const line = this.tracers.shift();
    if (!line) return;
    this.tracers.push(line);
    const p = line.geometry.attributes.position as THREE.BufferAttribute;
    p.setXYZ(0, from.x, from.y, from.z);
    p.setXYZ(1, to.x, to.y, to.z);
    p.needsUpdate = true;
    (line.material as THREE.LineBasicMaterial).opacity = 0.85;
  }

  private emit(x: number, y: number, z: number, count: number, color: [number, number, number], spread: number, up: number) {
    const P = this.particles;
    for (let i = 0; i < count; i++) {
      const idx = P.cursor;
      P.cursor = (P.cursor + 1) % P.n;
      P.pos[idx * 3] = x;
      P.pos[idx * 3 + 1] = y;
      P.pos[idx * 3 + 2] = z;
      P.vel[idx * 3] = (Math.random() - 0.5) * spread;
      P.vel[idx * 3 + 1] = Math.random() * up;
      P.vel[idx * 3 + 2] = (Math.random() - 0.5) * spread;
      P.col[idx * 3] = color[0];
      P.col[idx * 3 + 1] = color[1];
      P.col[idx * 3 + 2] = color[2];
      P.life[idx] = 0.5 + Math.random() * 0.5;
    }
  }

  private blood(x: number, y: number, z: number, n: number) {
    this.emit(x, y, z, n, [0.65, 0.05, 0.06], 5, 3.5);
  }

  private fireBurst(x: number, z: number) {
    this.emit(x, 0.6, z, 26, [1, 0.5, 0.1], 6, 6);
  }

  private toast(text: string, kind: Toast["kind"]) {
    this.toasts.push({ id: this.toastId++, text, kind });
    if (this.toasts.length > 4) this.toasts.shift();
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.text !== text || t.kind !== kind);
    }, 2200);
  }

  // ---------------------------------------------------------------- helpers
  private lookDir() {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    ).normalize();
  }

  private moveInput() {
    const f = (this.keys["KeyW"] ? 1 : 0) - (this.keys["KeyS"] ? 1 : 0);
    const s = (this.keys["KeyD"] ? 1 : 0) - (this.keys["KeyA"] ? 1 : 0);
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const v = new THREE.Vector2(fx * f + -fz * s, fz * f + fx * s);
    if (v.lengthSq() > 0) v.normalize();
    return v;
  }

  private isSprinting() {
    return (
      (this.keys["ShiftLeft"] || this.keys["ShiftRight"]) &&
      this.stamina > 2 &&
      !this.downed &&
      this.moveInput().lengthSq() > 0 &&
      (this.keys["KeyW"] ?? false)
    );
  }

  // ---------------------------------------------------------------- loop
  private loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    let dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      dt *= 0.25;
    }
    const active = this.phase === "playing" || this.phase === "respite";
    if (active) this.step(dt);
    this.updateCamera(dt, active);
    this.renderer.render(this.scene, this.camera);

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.06;
      this.pushState();
    }
  };

  private step(dt: number) {
    this.arena.update(dt);
    this.updatePlayer(dt);
    if (this.phase === "playing") this.updateSpawning(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateFx(dt);

    if (this.phase === "respite") {
      this.respiteLeft -= dt;
      if (this.respiteLeft <= 0) this.startWave(this.wave + 1);
    }
  }

  private updateSpawning(dt: number) {
    const alive = this.enemies.filter((e) => e.alive).length;
    this.spawnTimer -= dt;
    if (this.spawnQueue.length && this.spawnTimer <= 0 && alive < MAX_ALIVE) {
      const kind = this.spawnQueue.shift()!;
      this.spawnEnemy(kind);
      this.spawnTimer = Math.max(0.16, 0.9 - this.wave * 0.03);
    }
    if (!this.spawnQueue.length && alive === 0) this.completeWave();
  }

  private updatePlayer(dt: number) {
    this.hurtCd -= dt;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.fireCd -= dt;
    this.dodgeCd -= dt;
    this.tackleCd -= dt;
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const need = this.magSize - this.mag;
        const take = Math.min(need, this.reserve);
        this.mag += take;
        this.reserve -= take;
      }
    }

    if (this.downed) {
      this.bleed -= dt;
      const holding = this.keys["KeyE"] && this.adrenaline > 0;
      if (holding) {
        this.reviveT += dt;
        if (this.reviveT >= 2.5) {
          this.adrenaline--;
          this.downed = false;
          this.hp = this.maxHp * 0.5;
          this.bleed = 0;
          this.reviveT = 0;
          this.sfx.play("revive");
          this.toast("Back on your feet!", "good");
        }
      } else {
        this.reviveT = Math.max(0, this.reviveT - dt * 0.6);
      }
      // only bleed out while still down - a revive on this frame zeroes bleed deliberately
      if (this.downed && this.bleed <= 0) {
        this.gameOver();
        return;
      }
    }

    // stamina
    const sprinting = this.isSprinting();
    if (sprinting) this.stamina = Math.max(0, this.stamina - 15 * dt);
    else if (this.tackleT <= 0)
      this.stamina = Math.min(
        this.maxStamina,
        this.stamina + (16 + 3 * this.lvl("stamina")) * dt * (1 + 0.2 * this.lvl("stamina")),
      );

    // movement
    const input = this.moveInput();
    let speed = this.downed ? 1.6 : sprinting ? 9.4 : 6.1;
    if (this.buffs.has("featherfoot") && sprinting) speed += 0.6;
    let vx = input.x * speed;
    let vz = input.y * speed;
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      vx = this.dodgeDir.x * 15;
      vz = this.dodgeDir.y * 15;
    }
    if (this.tackleT > 0) {
      this.tackleT -= dt;
      vx = this.tackleDir.x * 17;
      vz = this.tackleDir.y * 17;
      this.resolveTackle();
      if (this.tackleT <= 0) this.tackleHits.clear();
    }
    this.pos.x += vx * dt;
    this.pos.z += vz * dt;

    // bounds
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > ARENA_R - 1) {
      this.pos.x *= (ARENA_R - 1) / r;
      this.pos.z *= (ARENA_R - 1) / r;
    }

    // hazards
    if (this.arena.inLava(this.pos.x, this.pos.z)) {
      this.lavaTick -= dt;
      if (this.lavaTick <= 0) {
        this.lavaTick = 0.35;
        this.hurt(11, "burn");
      }
      this.emit(this.pos.x, 0.2, this.pos.z, 2, [1, 0.4, 0.1], 2, 3);
    }
    if (this.arena.inEruption(this.pos.x, this.pos.z)) {
      this.lavaTick -= dt;
      if (this.lavaTick <= 0) {
        this.lavaTick = 0.4;
        this.hurt(16, "burn");
      }
    }

    // weapons
    if (!this.downed && this.locked) {
      if (this.weapon === "rifle" && this.mouseDown) this.fireRifle();
      if (this.weapon === "machete" && this.mouseDown) this.trySwing();
    }
    if (this.swingT > 0) {
      this.swingT -= dt;
      if (!this.swingHit && this.swingT < 0.27) {
        this.swingHit = true;
        this.meleeHits();
      }
    }

    this.bobT += dt * (sprinting ? 13 : 8) * (input.lengthSq() > 0 ? 1 : 0);
    this.rifleModel.visible = this.weapon === "rifle";
    this.macheteModel.visible = this.weapon === "machete";
    // viewmodel animation
    this.recoil = Math.max(0, this.recoil - dt * 7);
    const swing = this.swingT > 0 ? Math.sin((1 - this.swingT / 0.42) * Math.PI) : 0;
    this.rifleModel.position.set(0.28, -0.26 + Math.sin(this.bobT) * 0.012, -0.15 + this.recoil * 0.09);
    this.rifleModel.rotation.x = this.recoil * 0.22;
    this.macheteModel.rotation.set(-swing * 2.1, swing * 0.6, -0.25 + swing * 1.2);
    this.macheteModel.position.set(0.34 - swing * 0.35, -0.34 + swing * 0.25, -0.35 - swing * 0.2);
    this.muzzle.intensity = Math.max(0, this.muzzle.intensity - dt * 40);
  }

  private resolveTackle() {
    for (const e of this.enemies) {
      if (!e.alive || this.tackleHits.has(e)) continue;
      const dx = e.mesh.position.x - this.pos.x;
      const dz = e.mesh.position.z - this.pos.z;
      if (Math.hypot(dx, dz) > 1.7 + e.radius) continue;
      this.tackleHits.add(e);
      const d = Math.hypot(dx, dz) || 1;
      const dir = new THREE.Vector3(dx / d, 0, dz / d);
      const wasCharging = e.chargeState === 1 || e.chargeState === 2;
      e.chargeState = 0;
      e.downTimer = wasCharging ? 3.2 : 2.2;
      e.mesh.rotation.z = 1.2;
      const push = this.buffs.has("juggernaut") ? 26 : 18;
      e.vx = dir.x * push;
      e.vz = dir.z * push;
      this.damageEnemy(e, 45, 0, dir, false, "tackle");
      this.hitStop = 0.07;
      this.shake = Math.min(1.2, this.shake + 0.3);
      this.sfx.play("melee_hit");
      if (wasCharging) this.toast("Charge broken!", "good");
    }
  }

  private updateEnemies(dt: number) {
    const px = this.pos.x;
    const pz = this.pos.z;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const m = e.mesh;

      if (e.flash > 0) {
        e.flash -= dt;
        for (const mat of e.mats)
          mat.emissive.setHex(e.flash > 0 ? 0x882222 : (mat.userData.baseEmissive ?? 0x000000));
      }

      if (!e.alive) {
        e.corpse -= dt;
        m.position.y = Math.max(-1.2, m.position.y - dt * 1.4);
        m.scale.multiplyScalar(1 - dt * 0.5);
        if (e.corpse <= 0) {
          this.scene.remove(m);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // knockback integration
      m.position.x += e.vx * dt;
      m.position.z += e.vz * dt;
      e.vx *= Math.pow(0.02, dt);
      e.vz *= Math.pow(0.02, dt);

      // hazards kill enemies
      if (this.arena.inLava(m.position.x, m.position.z)) {
        this.killEnemy(e, "lava");
        continue;
      }
      if (this.arena.inEruption(m.position.x, m.position.z)) {
        this.killEnemy(e, "geyser");
        continue;
      }

      if (e.downTimer > 0) {
        e.downTimer -= dt;
        if (e.downTimer <= 0) m.rotation.z = 0;
        continue;
      }

      const dx = px - m.position.x;
      const dz = pz - m.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      const nx = dx / dist;
      const nz = dz / dist;
      m.rotation.y = Math.atan2(nx, nz) + Math.PI;
      e.bob += dt * e.speed * 2.4;
      const legs = m.userData.legs as THREE.Mesh[];
      if (legs) {
        legs[0].rotation.x = Math.sin(e.bob) * 0.7;
        legs[1].rotation.x = -Math.sin(e.bob) * 0.7;
      }

      let mvx = 0;
      let mvz = 0;
      e.attackCd -= dt;

      if (e.kind === "harasser") {
        // flanking: approach on an arc
        const arc = dist > 6 ? 0.8 * e.flank : 0.15 * e.flank;
        const ang = Math.atan2(nz, nx) + arc;
        mvx = Math.cos(ang) * e.speed;
        mvz = Math.sin(ang) * e.speed;
        if (dist < 1.5 + e.radius && e.attackCd <= 0) {
          e.attackCd = 0.9;
          this.hurt(e.damage, "hit", m.position.x, m.position.z);
        }
      } else if (e.kind === "spitter") {
        e.shootCd -= dt;
        const want = 11;
        const drive = dist > want + 2 ? 1 : dist < want - 2 ? -1 : 0;
        const strafe = 0.5 * e.flank;
        mvx = (nx * drive + -nz * strafe) * e.speed;
        mvz = (nz * drive + nx * strafe) * e.speed;
        if (dist < 22 && e.shootCd <= 0) {
          e.shootCd = 2.4;
          this.spit(e);
        }
      } else {
        // heavy charger
        if (e.chargeState === 0) {
          mvx = nx * e.speed;
          mvz = nz * e.speed;
          e.chargeCd -= dt;
          if (dist < 15 && dist > 3 && e.chargeCd <= 0) {
            e.chargeState = 1;
            e.chargeTimer = 1.0;
            for (const mat of e.mats) mat.emissive.setHex(0xff3300);
          }
          if (dist < 1.9 + e.radius && e.attackCd <= 0) {
            e.attackCd = 1.2;
            this.hurt(e.damage, "hit", m.position.x, m.position.z);
          }
        } else if (e.chargeState === 1) {
          e.chargeTimer -= dt;
          m.scale.y = 1.55 * (1 + Math.sin(e.chargeTimer * 30) * 0.04);
          if (e.chargeTimer <= 0) {
            e.chargeState = 2;
            e.chargeTimer = 1.3;
            e.chargeDir.set(nx, nz);
            m.scale.y = 1.55;
          }
        } else if (e.chargeState === 2) {
          e.chargeTimer -= dt;
          mvx = e.chargeDir.x * 15;
          mvz = e.chargeDir.y * 15;
          if (dist < 1.6 + e.radius) {
            this.hurt(e.damage * 1.4, "hit", m.position.x, m.position.z);
            this.pos.x += e.chargeDir.x * 3;
            this.pos.z += e.chargeDir.y * 3;
            e.chargeState = 3;
            e.chargeTimer = 1.1;
          }
          if (e.chargeTimer <= 0) {
            e.chargeState = 3;
            e.chargeTimer = 1.2;
          }
        } else {
          e.chargeTimer -= dt;
          for (const mat of e.mats) mat.emissive.setHex(mat.userData.baseEmissive ?? 0x000000);
          if (e.chargeTimer <= 0) {
            e.chargeState = 0;
            e.chargeCd = 4 + Math.random() * 3;
          }
        }
      }

      m.position.x += mvx * dt;
      m.position.z += mvz * dt;

      // separation
      for (let j = i - 1; j >= 0; j--) {
        const o = this.enemies[j];
        if (!o.alive) continue;
        const ox = m.position.x - o.mesh.position.x;
        const oz = m.position.z - o.mesh.position.z;
        const dd = Math.hypot(ox, oz);
        const min = e.radius + o.radius + 0.15;
        if (dd > 0.001 && dd < min) {
          const push = ((min - dd) / dd) * 0.5;
          m.position.x += ox * push;
          m.position.z += oz * push;
          o.mesh.position.x -= ox * push;
          o.mesh.position.z -= oz * push;
        }
      }

      // don't let the player stand inside enemies
      const pd = Math.hypot(px - m.position.x, pz - m.position.z);
      const minP = e.radius + 0.45;
      if (pd < minP && this.tackleT <= 0) {
        const k = (minP - pd) / (pd || 1);
        this.pos.x += (px - m.position.x) * k * 0.5;
        this.pos.z += (pz - m.position.z) * k * 0.5;
      }
    }
  }

  private spit(e: Enemy) {
    const from = e.mesh.position.clone();
    from.y = 1.5;
    const dir = new THREE.Vector3(this.pos.x - from.x, this.pos.y - 0.3 - from.y, this.pos.z - from.z).normalize();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xa8ff5c }),
    );
    mesh.position.copy(from);
    this.scene.add(mesh);
    const sp = 17;
    this.projectiles.push({ mesh, vx: dir.x * sp, vy: dir.y * sp + 1.2, vz: dir.z * sp, life: 3.5 });
    this.sfx.play("spit");
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.vy -= 4.5 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.life -= dt;
      const d = p.mesh.position.distanceTo(new THREE.Vector3(this.pos.x, this.pos.y - 0.4, this.pos.z));
      if (d < 0.85) {
        this.hurt(13, "hit", p.mesh.position.x, p.mesh.position.z);
        this.emit(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z, 8, [0.6, 1, 0.3], 3, 2);
        p.life = 0;
      }
      if (p.mesh.position.y < 0 || p.life <= 0) {
        this.emit(p.mesh.position.x, 0.2, p.mesh.position.z, 5, [0.6, 1, 0.3], 2, 1.5);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updatePickups(dt: number) {
    const magnet = this.buffs.has("magnet") ? 9 : 2.4;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.mesh.rotation.y += dt * 2.2;
      p.mesh.position.y = 0.55 + Math.sin(performance.now() * 0.004 + i) * 0.12;
      const dx = this.pos.x - p.mesh.position.x;
      const dz = this.pos.z - p.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < magnet && !this.downed) {
        p.mesh.position.x += (dx / d) * dt * 9;
        p.mesh.position.z += (dz / d) * dt * 9;
      }
      if (d < 1.2 && !this.downed) {
        if (p.kind === "ammo") {
          this.reserve = Math.min(this.reserveMax, this.reserve + 70);
          this.toast("+70 ammo", "good");
        } else if (p.kind === "med") {
          this.heal(35);
          this.toast("+35 health", "good");
        } else {
          this.addSlag(70);
          this.toast("+70 slag", "good");
        }
        this.sfx.play("pickup");
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
        continue;
      }
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
      }
    }
  }

  private updateFx(dt: number) {
    const P = this.particles;
    for (let i = 0; i < P.n; i++) {
      if (P.life[i] <= 0) continue;
      P.life[i] -= dt;
      P.vel[i * 3 + 1] -= 9 * dt;
      P.pos[i * 3] += P.vel[i * 3] * dt;
      P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt;
      P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
      if (P.pos[i * 3 + 1] < 0.02 || P.life[i] <= 0) {
        P.life[i] = 0;
        P.pos[i * 3 + 1] = -999;
      }
    }
    (P.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (P.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    for (const t of this.tracers) {
      const mat = t.material as THREE.LineBasicMaterial;
      if (mat.opacity > 0) mat.opacity = Math.max(0, mat.opacity - dt * 6);
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3.2);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 1.6);
    this.hurtFromT = Math.max(0, this.hurtFromT - dt * 0.8);
    this.shake = Math.max(0, this.shake - dt * 3);
  }

  private updateCamera(dt: number, active: boolean) {
    const eye = this.downed ? 0.75 : 1.7;
    const bob = active && !this.downed ? Math.sin(this.bobT) * 0.045 : 0;
    const targetFov = this.isSprinting() ? 88 : this.tackleT > 0 ? 95 : 78;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 8);
    this.camera.updateProjectionMatrix();

    const sx = (Math.random() - 0.5) * this.shake * 0.35;
    const sy = (Math.random() - 0.5) * this.shake * 0.35;
    this.camera.position.set(this.pos.x + sx, eye + bob + sy, this.pos.z);
    const roll = this.dodgeT > 0 ? Math.sin((0.32 - this.dodgeT) / 0.32 * Math.PI) * 0.5 : 0;
    this.camera.rotation.set(this.pitch - this.recoil * 0.06, this.yaw, roll, "YXZ");
  }

  // ---------------------------------------------------------------- hud
  private shopItems(): ShopItem[] {
    return UPGRADES.map((u) => {
      const level = this.lvl(u.id);
      return {
        id: u.id,
        name: u.name,
        desc: u.desc,
        cost: u.baseCost + u.costStep * level,
        level,
        maxLevel: u.maxLevel,
      };
    });
  }

  private pushState() {
    this.onState({
      phase: this.phase,
      hurtDir: this.hurtFromAng,
      hurtDirT: this.hurtFromT,
      wave: this.wave,
      bestWave: this.bestWave,
      enemiesLeft: this.enemies.filter((e) => e.alive).length + this.spawnQueue.length,
      waveTotal: this.waveTotal,
      respiteLeft: Math.max(0, this.respiteLeft),
      hp: Math.max(0, Math.round(this.hp)),
      maxHp: this.maxHp,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      slag: this.slag,
      weapon: this.weapon,
      mag: this.mag,
      magSize: this.magSize,
      reserve: this.reserve,
      reloading: this.reloadT > 0,
      downed: this.downed,
      bleedOut: Math.max(0, this.bleed),
      reviveProgress: Math.min(1, this.reviveT / 2.5),
      adrenaline: this.adrenaline,
      kills: this.kills,
      shop: this.shopItems(),
      draft: this.draft,
      buffs: [...this.buffs],
      toasts: [...this.toasts],
      hitFlash: this.hitFlash,
      damageFlash: this.damageFlash,
      comboKills: this.combo,
    });
  }
}
