"use client";

import { useEffect, useState } from "react";
import { Header } from "../../components/layout/Header";
import { typeLabel } from "../../lib/cardTypes";

// ---- Shape of web/public/stats.json (produced by scripts/generate_stats.py) ----
interface SkillFreq {
  skill: string;
  count: number;
}
interface GroupSummary {
  count: number;
  costDistribution: Record<string, number>;
  skillFrequency: SkillFreq[];
}
interface Stats {
  generatedAt: string;
  totalCards: number;
  costDistribution: Record<string, number>;
  rarityDistribution: Record<string, number>;
  vanillaVsSkilled: { vanilla: number; skilled: number };
  skillFrequency: SkillFreq[];
  byCreatureType: Record<string, GroupSummary>;
  boss: GroupSummary;
  legend: GroupSummary;
}

const RARITY_COLOR: Record<string, string> = {
  common: "#5a6072",
  rare: "#7f88a3",
  legend: "#c29a06",
  boss: "#d64500",
};
const ACCENT = "#5c6bd6";
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

interface Bar {
  label: string;
  value: number;
  color?: string;
}

/** Horizontal bar list, widths normalized to the largest value in the set. */
function BarList({ bars, unit = "" }: { bars: Bar[]; unit?: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="stats-bars">
      {bars.map((b) => (
        <div className="stats-bar-row" key={b.label}>
          <span className="stats-bar-label">{b.label}</span>
          <span className="stats-bar-track">
            <span
              className="stats-bar-fill"
              style={{
                width: `${(b.value / max) * 100}%`,
                background: b.color ?? ACCENT,
              }}
            />
          </span>
          <span className="stats-bar-value">
            {b.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

const costBars = (dist: Record<string, number>): Bar[] =>
  Object.entries(dist).map(([cost, n]) => ({ label: cost, value: n }));

const skillBars = (freq: SkillFreq[]): Bar[] =>
  freq.map((s) => ({ label: cap(s.skill), value: s.count }));

/** Compact per-group card: cost curve + skills, reused for each creature
 * family and for the Boss / Legend tiers. */
function GroupCard({ title, group }: { title: string; group: GroupSummary }) {
  return (
    <div className="stats-type-card">
      <div className="stats-type-head">
        <span className="stats-type-name">{title}</span>
        <span className="stats-type-count">{group.count} cards</span>
      </div>
      <p className="stats-mini-label">Cost</p>
      <BarList bars={costBars(group.costDistribution)} />
      <p className="stats-mini-label">Skills</p>
      {group.skillFrequency.length > 0 ? (
        <div className="stats-chips">
          {group.skillFrequency.map((s) => (
            <span className="stats-chip" key={s.skill}>
              {cap(s.skill)} <b>{s.count}</b>
            </span>
          ))}
        </div>
      ) : (
        <p className="stats-empty">All vanilla</p>
      )}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/stats.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  // Re-run the Python analyzer server-side, then swap in the fresh stats.
  const update = async () => {
    setUpdating(true);
    setUpdateError(null);
    try {
      const r = await fetch("/api/stats", { method: "POST" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      setStats(await r.json());
      setError(false);
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : String(e));
    } finally {
      setUpdating(false);
    }
  };

  const updateButton = (
    <div className="stats-controls">
      <button
        className="stats-update-btn"
        onClick={update}
        disabled={updating}
      >
        {updating ? "Updating…" : "Update stats"}
      </button>
      {updateError && (
        <span className="stats-update-error">Update failed: {updateError}</span>
      )}
    </div>
  );

  if (error) {
    return (
      <main className="page">
        <Header subtitle="Stats" />
        <p className="info-message">
          Stats not generated yet. Click Update, or run{" "}
          <code>python3 scripts/generate_stats.py</code>.
        </p>
        {updateButton}
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="page">
        <Header subtitle="Stats" />
        <p className="info-message">Loading stats…</p>
      </main>
    );
  }

  const rarityBars: Bar[] = Object.entries(stats.rarityDistribution).map(
    ([r, n]) => ({ label: cap(r), value: n, color: RARITY_COLOR[r] })
  );
  const bodyBars: Bar[] = [
    { label: "Has skill", value: stats.vanillaVsSkilled.skilled, color: ACCENT },
    { label: "Vanilla", value: stats.vanillaVsSkilled.vanilla, color: "#5a6072" },
  ];

  return (
    <main className="page">
      <Header subtitle="Stats" />

      <div className="stats-sections">
        {updateButton}
        <section className="stats-section">
          <div className="stats-kpis">
            <div className="stats-kpi">
              <span className="stats-kpi-value">{stats.totalCards}</span>
              <span className="stats-kpi-label">Total cards</span>
            </div>
            <div className="stats-kpi">
              <span className="stats-kpi-value">
                {Object.keys(stats.byCreatureType).length}
              </span>
              <span className="stats-kpi-label">Families</span>
            </div>
            <div className="stats-kpi">
              <span className="stats-kpi-value">
                {stats.skillFrequency.length}
              </span>
              <span className="stats-kpi-label">Skills</span>
            </div>
          </div>
        </section>

        <section className="stats-section">
          <h3>Cost distribution</h3>
          <BarList bars={costBars(stats.costDistribution)} />
        </section>

        <section className="stats-section">
          <h3>Rarity distribution</h3>
          <BarList bars={rarityBars} />
        </section>

        <section className="stats-section">
          <h3>Vanilla vs skilled</h3>
          <BarList bars={bodyBars} />
        </section>

        <section className="stats-section">
          <h3>Skills — most to least frequent</h3>
          <BarList bars={skillBars(stats.skillFrequency)} />
        </section>

        <section className="stats-section">
          <h3>By creature family</h3>
          <p className="guide-lead">
            Cost curve and skill mix for every creature family.
          </p>
          <div className="stats-type-grid">
            {Object.entries(stats.byCreatureType).map(([type, group]) => (
              <GroupCard key={type} title={typeLabel(type)} group={group} />
            ))}
          </div>
        </section>

        <section className="stats-section">
          <h3>Special tiers</h3>
          <p className="guide-lead">
            The powerful cards — Legend (allies) and Boss (enemies).
          </p>
          <div className="stats-type-grid">
            <GroupCard title="Legend" group={stats.legend} />
            <GroupCard title="Boss" group={stats.boss} />
          </div>
        </section>

        <p className="stats-meta">
          Generated {new Date(stats.generatedAt).toLocaleString()} ·{" "}
          scripts/generate_stats.py
        </p>
      </div>
    </main>
  );
}
