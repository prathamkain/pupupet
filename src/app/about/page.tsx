import Link from "next/link";
import SiteNav from "../components/site-nav";

const steps = [
  { number: "01", title: "Sign in simply", body: "Privy creates an embedded wallet for you. You can use Pupu without setting up a separate wallet app." },
  { number: "02", title: "Care for the kitten", body: "Feed, play, or contribute to the Commons as often as you like. Daily streaks advance once per UTC day." },
  { number: "03", title: "Verify each action", body: "Sponsored transactions are submitted through SmoothSend to Avalanche C-Chain mainnet. Recent activity links to the transaction on Snowtrace." },
];

export default function AboutPage() {
  return <main className="app-shell">
    <SiteNav />
    <section className="subpage-hero about-hero">
      <span className="eyebrow"><i /> ABOUT PUPU</span>
      <h1>A tiny pet.<br /><em>A shared reason to show up.</em></h1>
      <p>Pupu is a community-care prototype on Avalanche. People care for one shared kitten through small, sponsored on-chain actions and watch the community progress together.</p>
      <Link className="primary-link" href="/">Meet Pupu <span>Ã¢â€ â€”</span></Link>
    </section>
    <section className="how-grid" aria-label="How Pupu works">
      {steps.map((step) => <article className="how-card" key={step.number}><span>{step.number}</span><h2>{step.title}</h2><p>{step.body}</p></article>)}
    </section>
    <section className="network-card">
      <div><span className="eyebrow">BUILT ON AVALANCHE</span><h2>WhatÃ¢â‚¬â„¢s on-chain?</h2><p>Pet care state, community contributions, streaks, and contract events live on Avalanche C-Chain mainnet. The app reads those records to show activity and community progress.</p></div>
      <div className="network-details"><div><small>NETWORK</small><strong>Avalanche C-Chain mainnet</strong></div><div><small>WALLET</small><strong>Privy embedded wallet</strong></div><div><small>GAS SPONSOR</small><strong>SmoothSend</strong></div></div>
    </section>
    <footer className="footer"><span>MADE FOR YOUR LITTLE COMPANION</span><span>ON-CHAIN Ã‚Â· GAS-SPONSORED Ã‚Â· AVALANCHE MAINNET</span></footer>
  </main>;
}
