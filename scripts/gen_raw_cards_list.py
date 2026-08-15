#!/usr/bin/env python3
"""Dump each card as "name, game" for a quick raw list.

Reads  shared/src/cards.json
Writes scripts/cards-list.txt

Run from anywhere:  python3 scripts/gen_raw_cards_list.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CARDS_PATH = ROOT / "shared" / "src" / "cards.json"
OUT_PATH = ROOT / "scripts" / "cards-list.txt"


def main() -> None:
    catalog = json.loads(CARDS_PATH.read_text(encoding="utf-8"))
    lines = [f"{c['name']}, {c['game']}" for c in catalog.values()]
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)} ({len(lines)} cards)")


if __name__ == "__main__":
    main()
