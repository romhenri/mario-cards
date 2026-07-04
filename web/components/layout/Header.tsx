"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  /** Compact variant for in-game pages */
  small?: boolean;
  /** Page qualifier shown under the logo, e.g. "Multiplayer" */
  subtitle?: string;
  /** Where the back button leads (non-home pages only) */
  backHref?: string;
}

/* Three-column header: back button on the left (hidden on the home page),
   logo centered — full size on home, reduced everywhere else. */
export function Header({ small = false, subtitle, backHref = "/" }: HeaderProps) {
  const isHome = usePathname() === "/";
  const classes = ["site-header", isHome && "home", small && "small"]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classes}>
      {!isHome && (
        <Link className="nav-pill header-back" href={backHref}>
          <span aria-hidden="true">←</span>
          <span className="header-back-label">Back</span>
        </Link>
      )}
      <h1 className="title">
        <Link href="/" title="Mario Cards — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="site-logo" src="/logo.png" alt="Mario Cards" />
        </Link>
        {subtitle && <span className="subtitle">{subtitle}</span>}
      </h1>
    </header>
  );
}
