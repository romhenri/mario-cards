// Message types: client -> server
export const CLIENT_MSG = {
  CREATE_ROOM: "create_room",
  JOIN_ROOM: "join_room",
  PLAYER_ACTION: "player_action",
  LEAVE_ROOM: "leave_room",
};

// Message types: server -> client
export const SERVER_MSG = {
  ROOM_CREATED: "room_created",
  ROOM_JOINED: "room_joined",
  GAME_START: "game_start",
  STATE_UPDATE: "state_update",
  ACTION_REJECTED: "action_rejected",
  GAME_OVER: "game_over",
  OPPONENT_DISCONNECTED: "opponent_disconnected",
  ERROR: "error",
};

export function encode(type, payload = {}) {
  return JSON.stringify({ type, payload });
}

/** Parse a raw WebSocket frame into { type, payload } or null if malformed. */
export function decode(raw) {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return null;
  }
  if (!msg || typeof msg.type !== "string") return null;
  return { type: msg.type, payload: msg.payload ?? {} };
}

/** Validate the shape of a PlayerAction payload. Returns an error string or null. */
export function validatePlayerAction(action) {
  if (!action || typeof action !== "object") return "Malformed action";
  switch (action.kind) {
    case "play_card":
      if (typeof action.handInstanceId !== "string") return "Missing handInstanceId";
      return null;
    case "attack": {
      if (typeof action.attackerInstanceId !== "string") return "Missing attackerInstanceId";
      const t = action.target;
      if (!t || typeof t !== "object") return "Missing target";
      if (t.type === "face") return null;
      if (t.type === "creature" && typeof t.creatureInstanceId === "string") return null;
      return "Invalid target";
    }
    case "end_turn":
      return null;
    default:
      return "Unknown action kind";
  }
}
