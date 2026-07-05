import { ModeSelect } from "../components/layout/ModeSelect";
import { Header } from "../components/layout/Header";

export default function HomePage() {
  return (
    <main className="page home">
      <Header />
      <ModeSelect />
    </main>
  );
}
