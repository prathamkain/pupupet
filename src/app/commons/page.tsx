"use client";

import { useEffect, useState } from "react";
import SiteNav from "../components/site-nav";

type Activity = { name: string; owner: string; transactionHash: string; blockNumber: string; status?: "reverted" };
type Leader = { owner: string; streak: number; careCount: number };
const networkName = "Avalanche Mainnet";
const explorerBaseUrl = "https://snowtrace.io";

export default function CommonsPage() {
  const [events, setEvents] = useState<Activity[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/activity", { cache: "no-store" });
        const data = await response.json() as { events?: Activity[]; leaders?: Leader[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load contract activity.");
        if (active) { setEvents(data.events ?? []); setLeaders(data.leaders ?? []); setError(""); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load contract activity.");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return <main className="app-shell">
    <SiteNav />
    <section className="subpage-hero">
      <span className="eyebrow"><i /> PUPU COMMUNITY</span>
      <h1>Care is better<br /><em>together.</em></h1>
      <p>See recent care attempts and the people showing up for Pupu. Every entry links to its {networkName} transaction so you can verify it on-chain.</p>
    </section>
    <section className="commons-page-grid">
      <div className="subpage-card activity-page-card">
        <div className="subpage-card-heading"><div><span className="eyebrow">LIVE ON {networkName.toUpperCase()}</span><h2>Recent activity</h2></div><span className="live-pill"><i /> UPDATING</span></div>
        {error ? <p className="activity-empty">Activity could not load: {error}</p> : events.length === 0 ? <p className="activity-empty">No pet or community activity has been indexed yet.</p> : <div className="activity-list">{events.map((event) => <article className="activity-row" key={`${event.transactionHash}-${event.name}`}>
          <span className="activity-symbol">{event.name === "Pet created" ? "✦" : event.name === "Pet fed" ? "♡" : event.name === "Community care" ? "✧" : "↗"}</span>
          <div className="activity-detail"><strong>{event.name}{event.status === "reverted" ? " · reverted" : ""}</strong><small>{event.owner.slice(0, 8)}…{event.owner.slice(-6)} · block {event.blockNumber}{event.status === "reverted" ? " · transaction failed" : ""}</small></div>
          <a href={`${explorerBaseUrl}/tx/${event.transactionHash}`} target="_blank" rel="noreferrer" aria-label={`View ${event.name} transaction on Snowtrace`}>View tx ↗</a>
        </article>)}</div>}
      </div>
      <aside className="subpage-card leaderboard-card">
        <span className="eyebrow">THE CARERS</span><h2>Community leaders</h2>
        <p className="subpage-muted">Ranked by on-chain community care contributions.</p>
        {leaders.length === 0 ? <p className="activity-empty">No community care contributions yet. Be the first to care for the Commons.</p> : <ol className="community-leaders">{leaders.map((leader, index) => <li key={leader.owner}><span className="leader-rank">{String(index + 1).padStart(2, "0")}</span><span className="leader-address">{leader.owner.slice(0, 8)}…{leader.owner.slice(-5)}</span><strong>{leader.careCount}</strong><small>{leader.streak}d streak</small></li>)}</ol>}
        <a className="text-link" href="/#home">Go care for Pupu <span>↗</span></a>
      </aside>
    </section>
    <footer className="footer"><span>MADE FOR YOUR LITTLE COMPANION</span><span>ON-CHAIN · GAS-SPONSORED · {networkName.toUpperCase()}</span></footer>
  </main>;
}
