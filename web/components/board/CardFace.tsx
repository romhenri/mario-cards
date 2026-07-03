"use client";

import type { CSSProperties } from "react";
import type { CardDefinition } from "@mario-cards/shared";

function darken(hex: string, amount = 0.35): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * (1 - amount));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Inline style for a card/creature frame: colorType background plus a
 * darker shade of it as the border (state classes still override it). */
export function cardStyle(def: CardDefinition): CSSProperties {
  return {
    background: def.colorType,
    "--card-border": darken(def.colorType),
  } as CSSProperties;
}

const KEYWORDS = [
  ["quick", "Quick"],
  ["fly", "Fly"],
  ["reach", "Reach"],
  ["stealth", "Stealth"],
  ["taunt", "Taunt"],
  ["shield", "Shield"],
] as const;

interface CardFaceProps {
  def: CardDefinition;
  /** Current values (board creatures may differ from the printed ones) */
  attack: number;
  health: number;
  showCost?: boolean;
}

/** Inner layout shared by hand cards, board creatures and the deck builder. */
export function CardFace({ def, attack, health, showCost = false }: CardFaceProps) {
  const active = KEYWORDS.filter(([key]) => def[key]);
  return (
    <>
      {showCost && <span className="cost-badge">{def.cost}</span>}
      <div className={showCost ? "name with-cost" : "name"}>{def.name}</div>
      {/* White circle backdrop sits behind the art (see .card-art-box) */}
      <div className="card-art-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="card-art" src={def.image} alt={def.name} draggable={false} />
      </div>
      <div className="stats">
        <span className="stat attack">{attack}</span>
        <span className="stat health">{health}</span>
      </div>
      {/* Always rendered so cards with and without keywords line up */}
      <div className="keywords">
        {active.map(([key, label]) => (
          <span key={key} className={`keyword ${key}`}>
            {label}
          </span>
        ))}
      </div>
    </>
  );
}
