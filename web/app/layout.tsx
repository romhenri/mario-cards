import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DifficultyButton } from "@/components/layout/DifficultyButton";
import { MuteButton } from "@/components/layout/MuteButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mario Cards",
  description: "A tiny Hearthstone-style card game, Mario themed",
  icons: { icon: "/icons/mushroom.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MuteButton />
        <DifficultyButton />
        {children}
      </body>
    </html>
  );
}
