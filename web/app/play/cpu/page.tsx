import { CpuGameScreen } from "../../../components/game/CpuGameScreen";

/** Play mode: pick one of your saved decks (or random) before the CPU game. */
export default function CpuGamePage() {
  return <CpuGameScreen chooseDeck />;
}
