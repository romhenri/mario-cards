import { WebSocketServer } from "ws";
import { sanitizeDeck } from "@mario-cards/shared";
import { log, logError } from "./logger.js";
import {
  CLIENT_MSG,
  decode,
  encode,
  SERVER_MSG,
  validatePlayerAction,
} from "./protocol.js";
import { RoomManager } from "./roomManager.js";

export function createWsServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });
  const roomManager = new RoomManager();
  const sessions = new Map(); // socket -> { room }

  wss.on("connection", (socket) => {
    log("client connected");
    sessions.set(socket, { room: null });

    socket.on("message", (raw) => {
      const msg = decode(raw);
      if (!msg) {
        socket.send(encode(SERVER_MSG.ERROR, { message: "Malformed message" }));
        return;
      }
      try {
        handleMessage(socket, msg);
      } catch (err) {
        logError("error handling message", msg.type, err);
        socket.send(encode(SERVER_MSG.ERROR, { message: "Internal server error" }));
      }
    });

    socket.on("close", () => {
      const session = sessions.get(socket);
      if (session?.room) session.room.handleDisconnect(socket);
      sessions.delete(socket);
      log("client disconnected");
    });

    socket.on("error", (err) => logError("socket error", err));
  });

  function handleMessage(socket, { type, payload }) {
    const session = sessions.get(socket);

    switch (type) {
      case CLIENT_MSG.CREATE_ROOM: {
        if (session.room) {
          socket.send(encode(SERVER_MSG.ERROR, { message: "Already in a room" }));
          return;
        }
        const room = roomManager.createRoom();
        // Invalid/missing decks fall back to a server-generated random one.
        const playerId = room.addPlayer(socket, sanitizeDeck(payload.deck));
        session.room = room;
        socket.send(
          encode(SERVER_MSG.ROOM_CREATED, { roomId: room.roomId, playerId })
        );
        break;
      }

      case CLIENT_MSG.JOIN_ROOM: {
        if (session.room) {
          socket.send(encode(SERVER_MSG.ERROR, { message: "Already in a room" }));
          return;
        }
        const roomId = String(payload.roomId ?? "").toUpperCase();
        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.send(encode(SERVER_MSG.ERROR, { message: "Room not found" }));
          return;
        }
        if (room.isFull() || room.hasStarted()) {
          socket.send(encode(SERVER_MSG.ERROR, { message: "Room is full" }));
          return;
        }
        session.room = room;
        const playerId = room.addPlayer(socket, sanitizeDeck(payload.deck));
        // room_joined must reach the client before the game_start emitted
        // by startIfReady, so the client knows its playerId first.
        socket.send(encode(SERVER_MSG.ROOM_JOINED, { roomId: room.roomId, playerId }));
        room.startIfReady();
        break;
      }

      case CLIENT_MSG.PLAYER_ACTION: {
        if (!session.room) {
          socket.send(encode(SERVER_MSG.ERROR, { message: "Not in a room" }));
          return;
        }
        const validationError = validatePlayerAction(payload);
        if (validationError) {
          socket.send(
            encode(SERVER_MSG.ACTION_REJECTED, { reason: validationError })
          );
          return;
        }
        session.room.handleAction(socket, payload);
        break;
      }

      case CLIENT_MSG.LEAVE_ROOM: {
        if (session.room) {
          session.room.handleDisconnect(socket);
          session.room = null;
        }
        break;
      }

      default:
        socket.send(
          encode(SERVER_MSG.ERROR, { message: `Unknown message type: ${type}` })
        );
    }
  }

  return wss;
}
