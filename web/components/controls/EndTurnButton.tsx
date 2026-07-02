"use client";

interface EndTurnButtonProps {
  enabled: boolean;
  onEndTurn: () => void;
}

export function EndTurnButton({ enabled, onEndTurn }: EndTurnButtonProps) {
  return (
    <button className="end-turn" disabled={!enabled} onClick={onEndTurn}>
      End Turn
    </button>
  );
}
