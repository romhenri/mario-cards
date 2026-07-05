#!/usr/bin/env python3
"""Analyze the card catalog and emit a stats JSON the /stats page consumes.

Reads  shared/src/cards.json
Writes web/public/stats.json

Run from anywhere:  python3 scripts/generate_stats.py
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CARDS_PATH = ROOT / "shared" / "src" / "cards.json"
OUT_PATH = ROOT / "web" / "public" / "stats.json"

# The keyword flags on a card, in a stable order.
SKILLS = ["taunt", "shield", "stealth", "quick", "bomb", "fly", "reach"]
RARITY_ORDER = ["common", "rare", "legend", "boss"]


def card_skills(card: dict) -> list[str]:
    """Skills a card actually carries, in SKILLS order."""
    return [s for s in SKILLS if card.get(s)]


def cost_distribution(cards: list[dict]) -> dict[str, int]:
    """{cost: count} covering every cost from min..max (gaps filled with 0)."""
    counts = Counter(c["cost"] for c in cards)
    if not counts:
        return {}
    lo, hi = min(counts), max(counts)
    return {str(cost): counts.get(cost, 0) for cost in range(lo, hi + 1)}


def skill_frequency(cards: list[dict]) -> list[dict]:
    """[{skill, count}] over the given cards, most frequent first."""
    counts = Counter()
    for c in cards:
        for s in card_skills(c):
            counts[s] += 1
    # Sort by count desc, then by the canonical SKILLS order for ties.
    return [
        {"skill": s, "count": counts[s]}
        for s in sorted(counts, key=lambda s: (-counts[s], SKILLS.index(s)))
    ]


def group_summary(cards: list[dict]) -> dict:
    """Reusable per-group block: count + cost curve + skill frequency."""
    return {
        "count": len(cards),
        "costDistribution": cost_distribution(cards),
        "skillFrequency": skill_frequency(cards),
    }


def build_stats(catalog: dict[str, dict]) -> dict:
    cards = list(catalog.values())
    total = len(cards)

    # Rarity distribution in the canonical order (only rarities that appear).
    rarity_counts = Counter(c["rarity"] for c in cards)
    rarity_distribution = {
        r: rarity_counts[r] for r in RARITY_ORDER if rarity_counts.get(r)
    }

    # Vanilla (no skills) vs skilled (at least one).
    skilled = sum(1 for c in cards if card_skills(c))
    vanilla = total - skilled

    # Per creature type, ordered by how many cards each family has.
    by_type: dict[str, list[dict]] = defaultdict(list)
    for c in cards:
        by_type[c["creatureType"]].append(c)
    by_creature_type = {
        t: group_summary(by_type[t])
        for t in sorted(by_type, key=lambda t: (-len(by_type[t]), t))
    }

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "totalCards": total,
        "costDistribution": cost_distribution(cards),
        "rarityDistribution": rarity_distribution,
        "vanillaVsSkilled": {"vanilla": vanilla, "skilled": skilled},
        "skillFrequency": skill_frequency(cards),
        "byCreatureType": by_creature_type,
        "boss": group_summary([c for c in cards if c["rarity"] == "boss"]),
        "legend": group_summary([c for c in cards if c["rarity"] == "legend"]),
    }


def main() -> None:
    catalog = json.loads(CARDS_PATH.read_text(encoding="utf-8"))
    stats = build_stats(catalog)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)} ({stats['totalCards']} cards)")


if __name__ == "__main__":
    main()
