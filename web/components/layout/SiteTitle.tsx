import Link from "next/link";

interface SiteTitleProps {
  /** Compact variant for in-game pages */
  small?: boolean;
  /** Page qualifier shown under the logo, e.g. "Multiplayer" */
  subtitle?: string;
}

export function SiteTitle({ small = false, subtitle }: SiteTitleProps) {
  return (
    <h1 className={small ? "title small" : "title"}>
      <Link href="/" title="Mario Cards — home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="site-logo" src="/logo.png" alt="Mario Cards" />
      </Link>
      {subtitle && <span className="subtitle">{subtitle}</span>}
    </h1>
  );
}
