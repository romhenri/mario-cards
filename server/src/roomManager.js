import { GameRoom } from "./gameRoom.js";
import { log } from "./logger.js";

const ROOM_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no lookalikes
const ROOM_ID_LENGTH = 6;

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> GameRoom
  }

  generateRoomId() {
    let id;
    do {
      id = Array.from(
        { length: ROOM_ID_LENGTH },
        () => ROOM_ID_ALPHABET[Math.floor(Math.random() * ROOM_ID_ALPHABET.length)]
      ).join("");
    } while (this.rooms.has(id));
    return id;
  }

  createRoom() {
    const roomId = this.generateRoomId();
    const room = new GameRoom(roomId, (id) => this.destroyRoom(id));
    this.rooms.set(roomId, room);
    log(`room ${roomId}: created (${this.rooms.size} total)`);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) ?? null;
  }

  destroyRoom(roomId) {
    if (this.rooms.delete(roomId)) {
      log(`room ${roomId}: destroyed (${this.rooms.size} total)`);
    }
  }
}
