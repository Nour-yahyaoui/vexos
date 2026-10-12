import Link from "next/link";
import { site } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <strong>{site.name} {site.version}</strong>
          <p className="muted">Built by {site.author}. Debian trixie based.</p>
        </div>
        <div>
          <p className="footer-title">Explore</p>
          <ul>
            <li><Link href="/docs/">Documentation</Link></li>
            <li><Link href="/docs/#tutorials">Tutorials</Link></li>
            <li><Link href="/docs/#build">Build the ISO</Link></li>
          </ul>
        </div>
        <div>
          <p className="footer-title">Code</p>
          <ul>
            <li><a href={site.repo} rel="noopener" target="_blank">Repository</a></li>
            <li><a href={site.releases} rel="noopener" target="_blank">Releases</a></li>
            <li><a href={site.profile} rel="noopener" target="_blank">{site.author} on GitHub</a></li>
          </ul>
        </div>
      </div>
      <div className="container muted small">© {new Date().getFullYear()} {site.author}. Built on the Linux kernel source in this repository.</div>
    </footer>
  );
}
