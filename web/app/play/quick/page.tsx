import { CpuGameScreen } from "../../../components/game/CpuGameScreen";

/** Quick Match: all-cards challenge — jump straight into a CPU game with a
 * random deck drawn from the whole catalog, no deck selector. */
export default function QuickMatchPage() {
  return <CpuGameScreen chooseDeck={false} />;
}
