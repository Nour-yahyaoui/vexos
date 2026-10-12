import Link from "next/link";
import { ExternalLink } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { site } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container bar">
        <Link href="/" className="brand" aria-label="VexOS Desktop home">
          <img src="/icon-512.png" alt="" width={30} height={30} />
          <span>VexOS</span>
        </Link>
        <nav aria-label="Main">
          <ul className="nav-links">
            <li><Link href="/#features">Features</Link></li>
            <li><Link href="/#dev-tools">Dev tools</Link></li>
            <li><Link href="/#get-started">Get started</Link></li>
            <li><Link href="/docs/">Docs</Link></li>
            <li><Link href="/#about">About</Link></li>
          </ul>
        </nav>
        <div className="bar-actions">
          <a className="btn btn-ghost btn-small" href={site.repo} rel="noopener" target="_blank">
            GitHub <ExternalLink size={14} aria-hidden="true" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
