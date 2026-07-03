import { ModeSelect } from "../components/layout/ModeSelect";
import { SiteTitle } from "../components/layout/SiteTitle";

export default function HomePage() {
  return (
    <main className="page">
      <SiteTitle />
      <p style={{ textAlign: "center" }}>
        A tiny Hearthstone-style card game. Pick a mode:
      </p>
      <ModeSelect />
    </main>
  );
}
