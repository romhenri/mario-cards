import Link from "next/link";
import { Header } from "../../components/layout/Header";

export default function ProfilePage() {
  return (
    <main className="page">
      <Header subtitle="Profile" />

      <div className="profile-placeholder">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="profile-placeholder-icon"
          src="/cards-assets/PiranhaPlant.png"
          alt="Piranha Plant"
        />
        <h2>Coming soon</h2>
      </div>
    </main>
  );
}
