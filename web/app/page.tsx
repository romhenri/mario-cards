import { ModeSelect } from "../components/layout/ModeSelect";
import { SiteTitle } from "../components/layout/SiteTitle";

export default function HomePage() {
  return (
    <main className="page">
      <SiteTitle />
      <ModeSelect />
    </main>
  );
}
