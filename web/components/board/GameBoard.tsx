"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ClientGameState, PlayerAction } from "@mario-cards/shared";
import { EndTurnButton } from "../controls/EndTurnButton";
import { TargetPrompt } from "../controls/TargetPrompt";
import { CreatureSlot } from "./CreatureSlot";
import { Hand } from "./Hand";
import { PlayerHud } from "./PlayerHud";

interface GameBoardProps {
  view: ClientGameState;
  youLabel: string;
  opponentLabel: string;
  /** Error/rejection feedback, e.g. "Not enough mana" */
  statusMessage: string | null;
  /** Neutral info, e.g. "CPU is thinking..." */
  infoMessage: string | null;
  onAction: (action: PlayerAction) => void;
  /** Rendered inside the game-over panel (e.g. "Play again" button) */
  gameOverActions?: ReactNode;
}

export function GameBoard({
  view,
  youLabel,
  opponentLabel,
  statusMessage,
  infoMessage,
  onAction,
  gameOverActions,
}: GameBoardProps) {
  const [selectedAttackerId, setSelectedAttackerId] = useState<string | null>(null);

  const canAct = view.yourTurn && view.phase === "playing";

  // Drop a stale selection when the turn changes or the creature left the board.
  useEffect(() => {
    if (!selectedAttackerId) return;
    const stillEligible =
      canAct &&
      view.you.board.some(
        (c) =>
          c.instanceId === selectedAttackerId &&
          !c.hasSummoningSickness &&
          !c.hasAttackedThisTurn
      );
    if (!stillEligible) setSelectedAttackerId(null);
  }, [view, canAct, selectedAttackerId]);

  const isEligibleAttacker = (instanceId: string) => {
    const creature = view.you.board.find((c) => c.instanceId === instanceId);
    return (
      !!creature &&
      canAct &&
      !creature.hasSummoningSickness &&
      !creature.hasAttackedThisTurn &&
      creature.currentAttack > 0
    );
  };

  const handleOwnCreatureClick = (instanceId: string) => {
    if (!isEligibleAttacker(instanceId)) return;
    setSelectedAttackerId((cur) => (cur === instanceId ? null : instanceId));
  };

  const handleEnemyCreatureClick = (creatureInstanceId: string) => {
    if (!selectedAttackerId) return;
    onAction({
      kind: "attack",
      attackerInstanceId: selectedAttackerId,
      target: { type: "creature", creatureInstanceId },
    });
    setSelectedAttackerId(null);
  };

  const handleFaceClick = () => {
    if (!selectedAttackerId) return;
    onAction({
      kind: "attack",
      attackerInstanceId: selectedAttackerId,
      target: { type: "face" },
    });
    setSelectedAttackerId(null);
  };

  const handlePlayCard = (handInstanceId: string) => {
    onAction({ kind: "play_card", handInstanceId });
  };

  const handleEndTurn = () => {
    setSelectedAttackerId(null);
    onAction({ kind: "end_turn" });
  };

  const finished = view.phase === "finished";
  const youWon = finished && view.winnerPlayerId === view.you.playerId;

  return (
    <div className="game-board">
      <PlayerHud
        name={opponentLabel}
        hp={view.opponent.hp}
        manaCurrent={view.opponent.manaCurrent}
        manaMax={view.opponent.manaMax}
        handCount={view.opponent.handCount}
        isActive={!view.yourTurn && view.phase === "playing"}
        faceTargetable={selectedAttackerId !== null}
        onFaceClick={handleFaceClick}
      />

      <div className={`board-row ${view.opponent.board.length === 0 ? "empty" : ""}`}>
        {view.opponent.board.map((creature) => (
          <CreatureSlot
            key={creature.instanceId}
            creature={creature}
            canAttack={false}
            selected={false}
            targetable={selectedAttackerId !== null}
            onClick={() => handleEnemyCreatureClick(creature.instanceId)}
          />
        ))}
      </div>

      <div className="divider" />

      <div className={`board-row ${view.you.board.length === 0 ? "empty" : ""}`}>
        {view.you.board.map((creature) => (
          <CreatureSlot
            key={creature.instanceId}
            creature={creature}
            canAttack={isEligibleAttacker(creature.instanceId)}
            selected={creature.instanceId === selectedAttackerId}
            targetable={false}
            onClick={() => handleOwnCreatureClick(creature.instanceId)}
          />
        ))}
      </div>

      <Hand
        cards={view.you.hand}
        manaCurrent={view.you.manaCurrent}
        canAct={canAct}
        onPlayCard={handlePlayCard}
      />

      <PlayerHud
        name={youLabel}
        hp={view.you.hp}
        manaCurrent={view.you.manaCurrent}
        manaMax={view.you.manaMax}
        handCount={view.you.hand.length}
        isActive={canAct}
      />

      <div className="controls-row">
        <EndTurnButton enabled={canAct} onEndTurn={handleEndTurn} />
        <TargetPrompt
          visible={selectedAttackerId !== null}
          onCancel={() => setSelectedAttackerId(null)}
        />
        <span className="info-message">
          Turn {view.turnNumber}
          {infoMessage ? ` — ${infoMessage}` : ""}
        </span>
      </div>

      <div className="status-message">{statusMessage}</div>

      {finished && (
        <div className="modal-backdrop">
          <div className="game-over">
            <h2>{youWon ? "Victory! 🎉" : "Defeat 💀"}</h2>
            {gameOverActions}
          </div>
        </div>
      )}
    </div>
  );
}
