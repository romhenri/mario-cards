// End-to-end multiplayer smoke test: two WebSocket clients create/join a
// room and play greedy all-face aggro until someone wins.
// Usage: node scripts/simulate-match.mjs [ws://localhost:8787]
import WebSocket from "ws";

const URL = process.argv[2] ?? "ws://localhost:8787";
const failures = [];

function assert(cond, label) {
  if (cond) console.log(`  ok - ${label}`);
  else {
    failures.push(label);
    console.error(`  FAIL - ${label}`);
  }
}

function makeClient(name) {
  const ws = new WebSocket(URL);
  const client = { name, ws, view: null, playerId: null, roomId: null, rejections: [] };
  ws.on("message", (raw) => {
    const { type, payload } = JSON.parse(raw.toString());
    switch (type) {
      case "room_created":
      case "room_joined":
        client.roomId = payload.roomId;
        client.playerId = payload.playerId;
        break;
      case "game_start":
      case "state_update":
        client.view = payload.state;
        break;
      case "action_rejected":
        client.rejections.push(payload.reason);
        break;
      case "game_over":
        client.winner = payload.winnerPlayerId;
        break;
      case "error":
        client.lastError = payload.message;
        break;
    }
    client.onMessage?.(type, payload);
  });
  return client;
}

function send(client, type, payload = {}) {
  client.ws.send(JSON.stringify({ type, payload }));
}

function waitFor(client, predicate, label, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (predicate(client)) return resolve();
    const timer = setTimeout(
      () => reject(new Error(`timeout waiting for: ${label} (${client.name})`)),
      timeoutMs
    );
    client.onMessage = () => {
      if (predicate(client)) {
        clearTimeout(timer);
        client.onMessage = null;
        resolve();
      }
    };
  });
}

/** Pick one greedy action from a filtered view: play card > attack face > end turn. */
function nextAction(view) {
  const affordable = view.you.hand.find((c) => {
    const cost = c.cardId === "goombo" ? 2 : 1;
    return cost <= view.you.manaCurrent;
  });
  if (affordable && view.you.board.length < 7) {
    return { kind: "play_card", handInstanceId: affordable.instanceId };
  }
  const attacker = view.you.board.find(
    (c) => !c.hasSummoningSickness && !c.hasAttackedThisTurn && c.currentAttack > 0
  );
  if (attacker) {
    return {
      kind: "attack",
      attackerInstanceId: attacker.instanceId,
      target: { type: "face" },
    };
  }
  return { kind: "end_turn" };
}

const a = makeClient("A");
const b = makeClient("B");

await Promise.all([
  new Promise((r) => a.ws.on("open", r)),
  new Promise((r) => b.ws.on("open", r)),
]);
console.log("connected to", URL);

// Room lifecycle
send(a, "create_room");
await waitFor(a, (c) => c.roomId !== null, "room_created");
assert(/^[A-Z2-9]{6}$/.test(a.roomId), `room code shape (${a.roomId})`);

send(b, "join_room", { roomId: a.roomId });
await waitFor(b, (c) => c.roomId !== null, "room_joined");
await waitFor(a, (c) => c.view !== null, "game_start for A");
await waitFor(b, (c) => c.view !== null, "game_start for B");

// State filtering
assert(a.view.you.playerId === a.playerId, "A sees itself as 'you'");
assert(a.view.opponent.hand === undefined, "opponent hand contents hidden");
assert(typeof a.view.opponent.handCount === "number", "opponent handCount present");
assert(a.view.you.deckCount > 0 && a.view.you.hand.length > 0, "own hand/deck visible as counts+cards");
assert(a.view.yourTurn !== b.view.yourTurn, "exactly one active player");
const first = a.view.yourTurn ? a : b;
const second = a.view.yourTurn ? b : a;
assert(first.view.you.hand.length === 4, "first player: 3 + turn-start draw = 4 cards");
assert(second.view.you.hand.length === 4, "second player: 3 + coin = 4 cards");

// Out-of-turn action must be rejected
send(second, "player_action", { kind: "end_turn" });
await waitFor(second, (c) => c.rejections.length > 0, "action_rejected");
assert(second.rejections[0] === "It's not your turn", "out-of-turn rejection reason");

// Play the match
let steps = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

while (!a.winner && !b.winner && steps < 500) {
  // Each client only trusts its own view; after an end_turn the other
  // client's state_update can arrive a tick later, so wait it out.
  const active = a.view.yourTurn ? a : b.view.yourTurn ? b : null;
  if (!active) {
    await sleep(10);
    continue;
  }
  const before = JSON.stringify(active.view);
  const rejectionsBefore = active.rejections.length;
  const action = nextAction(active.view);
  send(active, "player_action", action);
  await waitFor(
    active,
    (c) =>
      c.winner ||
      c.rejections.length > rejectionsBefore ||
      JSON.stringify(c.view) !== before,
    `state change after step ${steps}`
  );
  if (active.rejections.length > rejectionsBefore) {
    console.error(
      `  step ${steps} REJECTED (${active.name}): ${JSON.stringify(action)} -> ${active.rejections.at(-1)}`
    );
    failures.push(`unexpected rejection at step ${steps}`);
    break;
  }
  steps++;
}

await waitFor(a, (c) => c.winner && c.view.phase === "finished", "game_over for A");
await waitFor(b, (c) => c.winner && c.view.phase === "finished", "game_over for B");
assert(a.winner && a.winner === b.winner, "both clients got the same winner");
assert(steps < 500, `match finished in ${steps} actions`);
const winnerName = a.winner === a.playerId ? "A" : "B";
console.log(`winner: player ${winnerName} after ${steps} actions, turn ${a.view.turnNumber}`);
const loserView = a.winner === a.playerId ? b.view : a.view;
assert(loserView.you.hp <= 0, "loser HP <= 0");
assert(a.view.phase === "finished", "phase is finished");

a.ws.close();
b.ws.close();

if (failures.length) {
  console.error(`\n${failures.length} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll multiplayer smoke checks passed ✅");
process.exit(0);
