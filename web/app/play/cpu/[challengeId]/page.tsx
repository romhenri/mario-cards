"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CpuGameScreen } from "../../../../components/game/CpuGameScreen";
import { Header } from "../../../../components/layout/Header";
import { CHALLENGES } from "../../../../lib/challenges";

/** One boss battle: choose your deck, then fight the boss's themed deck. */
export default function ChallengeGamePage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const challenge = CHALLENGES.find((c) => c.id === challengeId);

  if (!challenge) {
    return (
      <main className="page">
        <Header subtitle="Challenges" />
        <p className="info-message">
          Unknown challenge. <Link href="/play/cpu">Back to challenges</Link>
        </p>
      </main>
    );
  }

  return <CpuGameScreen challenge={challenge} />;
}
