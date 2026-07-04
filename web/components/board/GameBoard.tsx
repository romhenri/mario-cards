"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  legalAttackTargets,
  type BoardCreature,
  type ClientGameState,
  type PlayerAction,
} from "@mario-cards/shared";
import {
  playGameOver,
  startBattleMusic,
  stopBattleMusic,
} from "../../lib/sounds";
import { EndTurnButton } from "../controls/EndTurnButton";
import { TargetPrompt } from "../controls/TargetPrompt";
import { CreatureSlot } from "./CreatureSlot";
import { Hand } from "./Hand";
import { PlayerHud } from "./PlayerHud";

const LUNGE_MS = 350;
const DEATH_MS = 650; // keep in sync with the creature-death CSS animation

interface GameBoardProps {
  view: ClientGameState;
  youLabel: string;
  opponentLabel: string;
  /** Error/rejection feedback, e.g. "Not enough coins" */
  statusMessage: string | null;
  /** Neutral info, e.g. "CPU is thinking..." */
  infoMessage: string | null;
  onAction: (action: PlayerAction) => void;
  /** Rendered inside the game-over panel (e.g. "Play again" button) */
  gameOverActions?: ReactNode;
}

/** A creature that just left the board, kept rendered while it animates out. */
interface Ghost {
  creature: BoardCreature;
  /** Position it occupied in its row, so the layout doesn't jump */
  index: number;
}

/** Move the attacker's card to the target and back (Web Animations API). */
function lunge(attacker: HTMLElement, target: HTMLElement) {
  const a = attacker.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const dx = t.left + t.width / 2 - (a.left + a.width / 2);
  const dy = t.top + t.height / 2 - (a.top + a.height / 2);
  attacker.style.zIndex = "20";
  const animation = attacker.animate(
    [
      { transform: "translate(0, 0)" },
      {
        transform: `translate(${dx * 0.85}px, ${dy * 0.85}px) scale(1.05)`,
        offset: 0.5,
      },
      { transform: "translate(0, 0)" },
    ],
    { duration: LUNGE_MS, easing: "ease-in-out" }
  );
  animation.onfinish = () => {
    attacker.style.zIndex = "";
  };
}

/** Current board plus dying ghosts spliced back into their old positions. */
function withGhosts(
  board: BoardCreature[],
  ghosts: Ghost[]
): Array<{ creature: BoardCreature; dying: boolean }> {
  const items = board.map((creature) => ({ creature, dying: false }));
  for (const ghost of [...ghosts].sort((a, b) => a.index - b.index)) {
    items.splice(Math.min(ghost.index, items.length), 0, {
      creature: ghost.creature,
      dying: true,
    });
  }
  return items;
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
  const [ghostsYou, setGhostsYou] = useState<Ghost[]>([]);
  const [ghostsOpp, setGhostsOpp] = useState<Ghost[]>([]);

  const slotRefs = useRef(new Map<string, HTMLButtonElement>());
  const youHudRef = useRef<HTMLDivElement | null>(null);
  const oppHudRef = useRef<HTMLDivElement | null>(null);
  const prevViewRef = useRef<ClientGameState | null>(null);

  const registerSlot = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) slotRefs.current.set(id, el);
    else slotRefs.current.delete(id);
  };

  const canAct = view.yourTurn && view.phase === "playing";

  // Battle music while playing; game-over jingle when it ends.
  useEffect(() => {
    if (view.phase === "playing") {
      startBattleMusic();
    } else {
      stopBattleMusic();
      if (view.phase === "finished") playGameOver();
    }
  }, [view.phase, view.gameId]);

  // Silence the music when leaving the battle page entirely.
  useEffect(() => stopBattleMusic, []);

  // Watch view transitions: spawn ghosts for dead creatures and animate
  // the opponent's attacks (ours are animated on click, before dispatch).
  useEffect(() => {
    const prev = prevViewRef.current;
    prevViewRef.current = view;
    if (!prev || prev.gameId !== view.gameId) {
      setGhostsYou([]);
      setGhostsOpp([]);
      return;
    }

    const gone = (before: BoardCreature[], after: BoardCreature[]): Ghost[] =>
      before
        .map((creature, index) => ({ creature, index }))
        .filter(
          ({ creature }) =>
            !after.some((c) => c.instanceId === creature.instanceId)
        );

    const goneYou = gone(prev.you.board, view.you.board);
    const goneOpp = gone(prev.opponent.board, view.opponent.board);

    if (goneYou.length > 0) {
      setGhostsYou((g) => [...g, ...goneYou]);
      setTimeout(
        () => setGhostsYou((g) => g.filter((x) => !goneYou.includes(x))),
        DEATH_MS
      );
    }
    if (goneOpp.length > 0) {
      setGhostsOpp((g) => [...g, ...goneOpp]);
      setTimeout(
        () => setGhostsOpp((g) => g.filter((x) => !goneOpp.includes(x))),
        DEATH_MS
      );
    }

    // Opponent attack detection (only on their turn): the attacker is the
    // creature that just got hasAttackedThisTurn, or one that died trading.
    if (prev.yourTurn) return;
    let attackerId: string | null = null;
    for (const c of view.opponent.board) {
      const p = prev.opponent.board.find((x) => x.instanceId === c.instanceId);
      if (p && !p.hasAttackedThisTurn && c.hasAttackedThisTurn) {
        attackerId = c.instanceId;
      }
    }
    if (!attackerId && goneOpp.length > 0) {
      attackerId = goneOpp[0].creature.instanceId;
    }
    if (!attackerId) return;

    const damagedYou = view.you.board.find((c) => {
      const p = prev.you.board.find((x) => x.instanceId === c.instanceId);
      return p !== undefined && c.currentHealth < p.currentHealth;
    });
    const targetId =
      damagedYou?.instanceId ?? goneYou[0]?.creature.instanceId ?? null;
    const faceHit = view.you.hp < prev.you.hp;

    // Next frame, so freshly added ghost nodes are measurable.
    const finalAttackerId = attackerId;
    requestAnimationFrame(() => {
      const attackerEl = slotRefs.current.get(finalAttackerId);
      const targetEl = targetId
        ? slotRefs.current.get(targetId)
        : faceHit
          ? youHudRef.current
          : null;
      if (attackerEl && targetEl) lunge(attackerEl, targetEl);
    });
  }, [view]);

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

  /** Animate the lunge, then land the action mid-swing. */
  const attackWith = (action: PlayerAction, targetEl: HTMLElement | null) => {
    if (!selectedAttackerId) return;
    const attackerEl = slotRefs.current.get(selectedAttackerId);
    setSelectedAttackerId(null);
    if (attackerEl && targetEl) {
      lunge(attackerEl, targetEl);
      window.setTimeout(() => onAction(action), LUNGE_MS / 2);
    } else {
      onAction(action);
    }
  };

  const handleEnemyCreatureClick = (creatureInstanceId: string) => {
    if (!selectedAttackerId) return;
    attackWith(
      {
        kind: "attack",
        attackerInstanceId: selectedAttackerId,
        target: { type: "creature", creatureInstanceId },
      },
      slotRefs.current.get(creatureInstanceId) ?? null
    );
  };

  const handleFaceClick = () => {
    if (!selectedAttackerId) return;
    attackWith(
      {
        kind: "attack",
        attackerInstanceId: selectedAttackerId,
        target: { type: "face" },
      },
      oppHudRef.current
    );
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

  const oppRow = withGhosts(view.opponent.board, ghostsOpp);
  const youRow = withGhosts(view.you.board, ghostsYou);

  // Keyword rules (taunt/fly/reach) restrict what the selected attacker may hit.
  const selectedAttacker = selectedAttackerId
    ? view.you.board.find((c) => c.instanceId === selectedAttackerId) ?? null
    : null;
  const legal = selectedAttacker
    ? legalAttackTargets(selectedAttacker, view.opponent.board)
    : null;
  const isLegalCreatureTarget = (instanceId: string) =>
    !!legal && legal.creatures.some((c) => c.instanceId === instanceId);

  return (
    <div className="game-board">
      <PlayerHud
        name={opponentLabel}
        hp={view.opponent.hp}
        coinsCurrent={view.opponent.coinsCurrent}
        coinsMax={view.opponent.coinsMax}
        handCount={view.opponent.handCount}
        isActive={!view.yourTurn && view.phase === "playing"}
        rootRef={oppHudRef}
      />

      <div className={`board-row ${oppRow.length === 0 ? "empty" : ""}`}>
        {oppRow.map(({ creature, dying }) => (
          <CreatureSlot
            key={creature.instanceId}
            creature={creature}
            canAttack={false}
            selected={false}
            targetable={!dying && isLegalCreatureTarget(creature.instanceId)}
            dying={dying}
            onClick={() => handleEnemyCreatureClick(creature.instanceId)}
            slotRef={registerSlot(creature.instanceId)}
          />
        ))}
      </div>

      <div className="divider">
        <div className="frontier-box">
          {(legal?.face ?? false) && (
            <button
              className="face-target attack-face frontier-side left"
              onClick={handleFaceClick}
            >
              Attack face
            </button>
          )}
          <span className="turn-count">Round {view.turnNumber}</span>
          <EndTurnButton enabled={canAct} onEndTurn={handleEndTurn} />
          {selectedAttackerId !== null && (
            <button
              className="face-target frontier-side right"
              onClick={() => setSelectedAttackerId(null)}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className={`board-row ${youRow.length === 0 ? "empty" : ""}`}>
        {youRow.map(({ creature, dying }) => (
          <CreatureSlot
            key={creature.instanceId}
            creature={creature}
            canAttack={!dying && isEligibleAttacker(creature.instanceId)}
            selected={creature.instanceId === selectedAttackerId}
            targetable={false}
            dying={dying}
            onClick={() => handleOwnCreatureClick(creature.instanceId)}
            slotRef={registerSlot(creature.instanceId)}
          />
        ))}
      </div>

      <PlayerHud
        name={youLabel}
        hp={view.you.hp}
        coinsCurrent={view.you.coinsCurrent}
        coinsMax={view.you.coinsMax}
        handCount={view.you.hand.length}
        isActive={canAct}
        rootRef={youHudRef}
      />

      <Hand
        cards={view.you.hand}
        coinsCurrent={view.you.coinsCurrent}
        canAct={canAct}
        onPlayCard={handlePlayCard}
      />

      <div className="controls-row">
        <TargetPrompt visible={selectedAttackerId !== null} />
        {infoMessage && <span className="info-message">{infoMessage}</span>}
      </div>

      <div className="status-message">{statusMessage}</div>

      {finished && (
        <div className="modal-backdrop">
          <div className="game-over">
            <h2>{youWon ? "Victory!" : "Defeat"}</h2>
            {gameOverActions}
          </div>
        </div>
      )}
    </div>
  );
}
