import { ModeSelect } from "../components/layout/ModeSelect";

export default function HomePage() {
  return (
    <main className="page">
      <h1 className="title">🍄 Mario Cards</h1>
      <p style={{ textAlign: "center" }}>
        A tiny Hearthstone-style card game. Pick a mode:
      </p>
      <ModeSelect />
    </main>
  );
}
