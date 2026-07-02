"use client";

import type { ClientGameState, PlayerAction } from "@mario-cards/shared";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8787";

export type ServerMessage =
  | { type: "room_created"; payload: { roomId: string; playerId: string } }
  | { type: "room_joined"; payload: { roomId: string; playerId: string } }
  | { type: "game_start"; payload: { state: ClientGameState } }
  | { type: "state_update"; payload: { state: ClientGameState } }
  | { type: "action_rejected"; payload: { reason: string } }
  | { type: "game_over"; payload: { winnerPlayerId: string } }
  | { type: "opponent_disconnected"; payload: Record<string, never> }
  | { type: "error"; payload: { message: string } };

type Listener = (msg: ServerMessage) => void;

/**
 * Singleton WebSocket client. Living at module scope, it survives Next.js
 * client-side navigation (lobby -> room page) without dropping the socket.
 * It also buffers the latest game state so a page mounting after a
 * game_start/state_update was received can still render it.
 */
class WsClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();

  roomId: string | null = null;
  playerId: string | null = null;
  lastView: ClientGameState | null = null;

  connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      const ws = this.ws;
      return new Promise((resolve, reject) => {
        ws.addEventListener("open", () => resolve(), { once: true });
        ws.addEventListener("error", () => reject(new Error("Connection failed")), {
          once: true,
        });
      });
    }

    const ws = new WebSocket(WS_URL);
    this.ws = ws;
    ws.addEventListener("message", (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      this.handleMessage(msg);
    });
    ws.addEventListener("close", () => {
      if (this.ws === ws) {
        this.ws = null;
        this.clearRoom();
      }
    });

    return new Promise((resolve, reject) => {
      ws.addEventListener("open", () => resolve(), { once: true });
      ws.addEventListener(
        "error",
        () => reject(new Error(`Could not connect to game server at ${WS_URL}`)),
        { once: true }
      );
    });
  }

  private handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case "room_created":
      case "room_joined":
        this.roomId = msg.payload.roomId;
        this.playerId = msg.payload.playerId;
        break;
      case "game_start":
      case "state_update":
        this.lastView = msg.payload.state;
        break;
    }
    for (const listener of this.listeners) listener(msg);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private send(type: string, payload: unknown = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to the game server");
    }
    this.ws.send(JSON.stringify({ type, payload }));
  }

  /** Send a request and resolve on the expected reply (or reject on error). */
  private request<P>(
    sendFn: () => void,
    expectedType: ServerMessage["type"]
  ): Promise<P> {
    return new Promise<P>((resolve, reject) => {
      const unsubscribe = this.subscribe((msg) => {
        if (msg.type === expectedType) {
          unsubscribe();
          resolve(msg.payload as P);
        } else if (msg.type === "error") {
          unsubscribe();
          reject(new Error(msg.payload.message));
        }
      });
      try {
        sendFn();
      } catch (err) {
        unsubscribe();
        reject(err);
      }
    });
  }

  createRoom() {
    return this.request<{ roomId: string; playerId: string }>(
      () => this.send("create_room"),
      "room_created"
    );
  }

  joinRoom(roomId: string) {
    return this.request<{ roomId: string; playerId: string }>(
      () => this.send("join_room", { roomId }),
      "room_joined"
    );
  }

  sendAction(action: PlayerAction) {
    this.send("player_action", action);
  }

  leaveRoom() {
    try {
      this.send("leave_room");
    } catch {
      // already disconnected — nothing to leave
    }
    this.clearRoom();
  }

  private clearRoom() {
    this.roomId = null;
    this.playerId = null;
    this.lastView = null;
  }
}

let instance: WsClient | null = null;

export function getWsClient(): WsClient {
  if (!instance) instance = new WsClient();
  return instance;
}
