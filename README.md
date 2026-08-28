# Neo Kestrel

A browser co-op shooter. Alien machines have occupied the city and parked a
siphon on the far bank of a plasma channel. Take the core back, run it home,
and hold the line.

Play: https://agastyadaratla-ops.github.io/lavafall-showdown/

## Playing

- **WASD** move, **mouse** look, **LMB** fire, **RMB** quick machete
- **1-5 / Q** swap weapons, **R** reload
- **Shift** sprint, **Space** dodge roll, **F** tackle
- **E** hold to self-revive when downed, **Esc** pause

Recover three cores to win. Every fifth wave is guarded by a boss that has to
fall before the wave advances.

## Co-op

Host a game to get a five-character room code, or join with one. Connections are
peer-to-peer over WebRTC, so there is no server and no account. The host
simulates enemies, waves and the core; every player owns their own movement.

## Development

Needs Node.js 22+.

```sh
npm install
npm run dev
```

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | SSR/Nitro build |
| `npm run build:pages` | Static build for GitHub Pages |
| `npm run lint` | ESLint + Prettier |

Pushing to `main` deploys the static build to GitHub Pages automatically.

## Layout

| Path | What lives there |
| --- | --- |
| `src/game/game.ts` | Simulation, player, combat, wave flow |
| `src/game/enemies.ts` | Enemy and boss registry, elite prefixes |
| `src/game/weapons.ts` | Weapon registry |
| `src/game/maps.ts` | Arena definition and palette |
| `src/game/arena.ts` | Arena geometry built from a map definition |
| `src/game/net.ts` | Peer-to-peer co-op transport |
| `pages/` | Entry point for the static GitHub Pages build |

## Built with

TanStack Start, React, TypeScript, Three.js, Tailwind CSS, PeerJS.
