import Peer, { type DataConnection } from "peerjs";

/**
 * Peer-to-peer co-op transport.
 *
 * Topology is a star: whoever hosts owns the room id and every other player
 * connects to them. The host relays peer traffic, so clients never need to know
 * about each other. PeerJS's public broker only introduces peers - once the
 * WebRTC connection is up, traffic is direct and costs nothing.
 *
 * Authority split (see game.ts):
 *   - each client owns and simulates its own player, and reports its state
 *   - the host owns enemies, waves and objectives, and broadcasts snapshots
 * Client-authoritative movement is fine here because co-op has no opponent to
 * cheat against.
 */

export type NetRole = "solo" | "host" | "client";

/** Per-player state, broadcast a few times a second. */
export interface NetPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  downed: boolean;
  weapon: string;
  kills: number;
}

/** One enemy in a host snapshot. Deliberately terse - this is the hot path. */
export interface NetEnemy {
  i: number;
  k: string;
  x: number;
  y: number;
  z: number;
  /** mesh yaw */
  r: number;
  a: boolean;
}

/** Flag state, owned by the host. */
export interface NetFlag {
  mode: "base" | "carried" | "dropped";
  carrier: string;
  x: number;
  z: number;
  ret: number;
}

export type NetMessage =
  | { t: "hello"; id: string; name: string }
  | { t: "roster"; players: NetPlayer[] }
  | { t: "player"; p: NetPlayer }
  | { t: "leave"; id: string }
  | {
      t: "world";
      wave: number;
      enemies: NetEnemy[];
      flag: NetFlag;
      captures: number;
    }
  | { t: "damage"; i: number; dmg: number; from: string }
  | { t: "start"; mapId: string };

export interface NetEvents {
  onMessage: (m: NetMessage, fromId: string) => void;
  onPeerJoin: (id: string) => void;
  onPeerLeave: (id: string) => void;
  onStatus: (status: NetStatus) => void;
}

export interface NetStatus {
  role: NetRole;
  room: string;
  connected: boolean;
  peers: number;
  error: string;
}

const PREFIX = "deadlands-coop-";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short, unambiguous room code - no O/0 or I/1 to confuse people reading it out. */
export function makeRoomCode(len = 5) {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export class NetSession {
  role: NetRole = "solo";
  room = "";
  /** our own peer id within the room (the host's is the room code itself) */
  selfId = "";
  private peer: Peer | null = null;
  /** host: every client. client: just the host. */
  private conns = new Map<string, DataConnection>();
  private events: NetEvents;
  private error = "";

  constructor(events: NetEvents) {
    this.events = events;
  }

  get connected() {
    return this.role !== "solo" && (this.role === "host" || this.conns.size > 0);
  }

  get peerCount() {
    return this.conns.size;
  }

  private status() {
    this.events.onStatus({
      role: this.role,
      room: this.room,
      connected: this.connected,
      peers: this.conns.size,
      error: this.error,
    });
  }

  /** Open a room and wait for players. Resolves with the shareable code. */
  host(name: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.close();
      const code = makeRoomCode();
      this.role = "host";
      this.room = code;
      this.selfId = "host";
      this.error = "";

      const peer = new Peer(PREFIX + code);
      this.peer = peer;

      peer.on("open", () => {
        this.status();
        resolve(code);
      });

      peer.on("connection", (conn) => this.adopt(conn, name));

      peer.on("error", (err) => {
        this.error = String(err?.message || err);
        this.status();
        reject(err);
      });
    });
  }

  /** Join an existing room by code. */
  join(code: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.close();
      const room = code.trim().toUpperCase();
      this.role = "client";
      this.room = room;
      this.error = "";

      const peer = new Peer();
      this.peer = peer;

      peer.on("open", (id) => {
        this.selfId = id;
        const conn = peer.connect(PREFIX + room, { reliable: false });

        const failTimer = setTimeout(() => {
          this.error = "No room with that code";
          this.status();
          reject(new Error(this.error));
        }, 12000);

        conn.on("open", () => {
          clearTimeout(failTimer);
          this.adopt(conn, name);
          this.rawSend(conn, { t: "hello", id: this.selfId, name });
          resolve();
        });

        conn.on("error", (err) => {
          clearTimeout(failTimer);
          this.error = String(err?.message || err);
          this.status();
          reject(err);
        });
      });

      peer.on("error", (err) => {
        this.error = String(err?.message || err);
        this.status();
        reject(err);
      });
    });
  }

  private adopt(conn: DataConnection, _name: string) {
    this.conns.set(conn.peer, conn);
    this.events.onPeerJoin(conn.peer);
    this.status();

    conn.on("data", (raw) => {
      const msg = raw as NetMessage;
      // the host is the hub: pass peer traffic along so clients see each other
      if (this.role === "host" && (msg.t === "player" || msg.t === "leave")) {
        this.relay(msg, conn.peer);
      }
      this.events.onMessage(msg, conn.peer);
    });

    const drop = () => {
      if (!this.conns.has(conn.peer)) return;
      this.conns.delete(conn.peer);
      this.events.onPeerLeave(conn.peer);
      if (this.role === "host") this.relay({ t: "leave", id: conn.peer }, conn.peer);
      this.status();
    };
    conn.on("close", drop);
    conn.on("error", drop);
  }

  private rawSend(conn: DataConnection, msg: NetMessage) {
    try {
      if (conn.open) conn.send(msg);
    } catch {
      /* a dropped frame is not worth tearing the session down */
    }
  }

  private relay(msg: NetMessage, exceptId: string) {
    for (const [id, conn] of this.conns) {
      if (id !== exceptId) this.rawSend(conn, msg);
    }
  }

  /** Host: to everyone. Client: to the host, which relays where appropriate. */
  send(msg: NetMessage) {
    for (const conn of this.conns.values()) this.rawSend(conn, msg);
  }

  close() {
    for (const conn of this.conns.values()) {
      try {
        conn.close();
      } catch {
        /* already gone */
      }
    }
    this.conns.clear();
    this.peer?.destroy();
    this.peer = null;
    this.role = "solo";
    this.room = "";
    this.selfId = "";
    this.status();
  }
}
