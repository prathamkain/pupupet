"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "My pet" },
  { href: "/commons", label: "Commons" },
  { href: "/about", label: "How it works" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return <header className="topbar">
    <Link className="brand" href="/" aria-label="Pupu home"><span className="brand-mark">✳</span><span>pupu</span></Link>
    <nav className="primary-nav" aria-label="Main navigation">
      {links.map((link) => {
        const active = pathname === link.href;
        return <Link key={link.href} href={link.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>{link.label}</Link>;
      })}
    </nav>
    <span className="network-tag"><i /> AVALANCHE MAINNET</span>
  </header>;
}
