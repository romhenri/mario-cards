import {
  attack,
  createGame,
  endTurn,
  playCard,
  toClientState,
} from "@mario-cards/shared";
import { log } from "./logger.js";
import { encode, SERVER_MSG } from "./protocol.js";

const DESTROY_DELAY_MS = 5000;

/**
 * One multiplayer match: two sockets + one authoritative GameState.
 * All actions are validated through the shared engine before being applied.
 */
export class GameRoom {
  constructor(roomId, onDestroy) {
    this.roomId = roomId;
    this.onDestroy = onDestroy;
    this.players = []; // { socket, playerId }
    this.state = null;
    this.destroyed = false;
  }

  isFull() {
    return this.players.length >= 2;
  }

  hasStarted() {
    return this.state !== null;
  }

  addPlayer(socket) {
    const playerId = globalThis.crypto.randomUUID();
    this.players.push({ socket, playerId });
    return playerId;
  }

  startIfReady() {
    if (this.players.length === 2 && !this.hasStarted()) this.start();
  }

  start() {
    this.state = createGame(this.players[0].playerId, this.players[1].playerId);
    log(`room ${this.roomId}: game started`);
    this.broadcast(SERVER_MSG.GAME_START);
  }

  /** Send the per-player filtered state to both players under the given type. */
  broadcast(type) {
    this.players.forEach((player, index) => {
      this.sendTo(player.socket, type, {
        state: toClientState(this.state, index),
      });
    });
  }

  sendTo(socket, type, payload) {
    if (socket.readyState === socket.OPEN) {
      socket.send(encode(type, payload));
    }
  }

  handleAction(socket, action) {
    const player = this.players.find((p) => p.socket === socket);
    if (!player) return;
    if (!this.hasStarted()) {
      this.sendTo(socket, SERVER_MSG.ACTION_REJECTED, {
        reason: "The game hasn't started yet",
      });
      return;
    }

    let result;
    switch (action.kind) {
      case "play_card":
        result = playCard(this.state, player.playerId, action.handInstanceId);
        break;
      case "attack":
        result = attack(
          this.state,
          player.playerId,
          action.attackerInstanceId,
          action.target
        );
        break;
      case "end_turn":
        result = endTurn(this.state, player.playerId);
        break;
    }

    if (result.error) {
      this.sendTo(socket, SERVER_MSG.ACTION_REJECTED, { reason: result.error });
      return;
    }

    this.state = result.state;
    this.broadcast(SERVER_MSG.STATE_UPDATE);

    if (this.state.phase === "finished") {
      for (const p of this.players) {
        this.sendTo(p.socket, SERVER_MSG.GAME_OVER, {
          winnerPlayerId: this.state.winnerPlayerId,
        });
      }
      log(`room ${this.roomId}: game over, winner ${this.state.winnerPlayerId}`);
      setTimeout(() => this.destroy(), DESTROY_DELAY_MS);
    }
  }

  handleDisconnect(socket) {
    const remaining = this.players.filter((p) => p.socket !== socket);
    if (remaining.length === this.players.length) return; // socket wasn't in this room
    for (const p of remaining) {
      this.sendTo(p.socket, SERVER_MSG.OPPONENT_DISCONNECTED, {});
    }
    log(`room ${this.roomId}: player disconnected`);
    setTimeout(() => this.destroy(), DESTROY_DELAY_MS);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.onDestroy(this.roomId);
  }
}
