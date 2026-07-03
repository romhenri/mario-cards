# 🍄 Mario Cards

A tiny Hearthstone-style web card game (v1): 2 cards, text-only UI, playable vs CPU or head-to-head over WebSocket.

## Structure

- `shared/` — TypeScript game engine (pure functions) + types, compiled to `shared/dist` and consumed by both the web app and the server.
- `server/` — Node.js (plain JS) WebSocket server for multiplayer. Authoritative: every action is validated through the shared engine.
- `web/` — Next.js + TypeScript frontend (vs CPU mode runs the engine locally in the browser).

## Setup

```bash
npm install
```

## Run

One command starts everything (compiles the shared engine, then runs the WebSocket server on port 8787 and the web app on port 3000 together):

```bash
npm run dev
```

For a production run (full build + `next start`):

```bash
npm start
```

The pieces can still be run separately if needed: `npm run dev:server` / `npm run dev:web` (after `npm run build:shared`).

Open http://localhost:3000. For multiplayer, open two tabs: create a room in one, join with the code in the other.

The web app reads `NEXT_PUBLIC_WS_URL` (default `ws://localhost:8787`) to find the game server.

## Tests

```bash
npm test   # shared engine unit tests
```

## Rules (v1)

- 30 HP per player; decks are 15× Galoomba (2 mana 2/2) + 15× Goomba (1 mana 1/1), shuffled. The card database (stats, colors, art) lives in `shared/src/cards.json`.
- 3-card starting hand; the player going second draws 1 extra card.
- Mana: +1 max per turn (cap 10), refilled at turn start; draw 1 at turn start (empty deck = no draw, no damage).
- Creatures can't attack the turn they're played (summoning sickness) and attack once per turn, targeting a creature (simultaneous combat with counter-attack) or the opponent's face.
- First player to bring the opponent to 0 HP wins.
