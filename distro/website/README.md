# VexOS website

The landing page and documentation for VexOS Desktop, built with Next.js (App Router) and exported as static files.

Pages: `/` (landing), `/docs/` (documentation). The site has SEO metadata, Open Graph and Twitter cards, JSON-LD, `sitemap.xml`, `robots.txt`, a web manifest, and favicons.

Landing page sections, in order: What it is · How VexOS is built (kernel to toolchains) · Where it lives and how it runs · Why it fits advanced work · Web, mobile, and desktop · Installing software · Features · Preinstalled toolchains · DevStudio · Get started · Learn · About.

The version (`site.version` in `src/lib/site.ts`) is 2.2.1.

## Run locally

```sh
cd distro/website
npm install
npm run dev          # http://localhost:3000
```

## Build the static site

```sh
npm run build        # writes out/
npx serve out        # optional local preview
```

`out/` is a plain folder, so any static host works: GitHub Pages, Netlify, Cloudflare Pages, or nginx.

## SEO

Built in:

- **Titles and descriptions** per page, with the search terms (Linux distro, Linux live ISO, Debian trixie, VirtualBox, web development, Nour-yahyaoui).
- **Structured data (JSON-LD):** `WebSite` and `Person` in the layout, `SoftwareApplication` and `FAQPage` on the landing page. The FAQ on the page and in the structured data come from the same list (`src/lib/seo.ts`).
- **Identity links:** `rel="me"` and `rel="author"` point to the GitHub profile.
- **Crawling:** `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph and Twitter cards, and Google's large image and snippet directives.

After you deploy, do these once:

1. Deploy on Vercel: set the project's **Root Directory** to `distro/website`. Vercel detects Next.js and builds the static export. Set `NEXT_PUBLIC_SITE_URL` in the Vercel project only if you use a different domain.
2. Verify the site in Google Search Console. Copy the HTML-tag code, then build with `GOOGLE_SITE_VERIFICATION=<code> npm run build`.
3. In Search Console, submit `https://your-domain/sitemap.xml`.
4. On your GitHub profile, add the site URL, so `rel="me"` is confirmed from both sides.
5. Link the site from the repository README and from the release notes. Inbound links help new pages get found.

Ranking for a generic term such as "Linux" takes time and competes with large, established sites. The landing page targets long-tail searches (for example, "Linux distro for web development" or "Debian trixie live ISO VirtualBox") and branded searches for VexOS and the author's name, which should rank quickly once the site is public.

## Before you deploy

- Set the public address so canonical links, the sitemap, and social cards point to the right place:
  `NEXT_PUBLIC_SITE_URL=https://your-domain.example npm run build`
  The default is `https://vexos-omega.vercel.app` (the Vercel deployment).
- The site lives at the root path. If you host it at a subpath (for example a GitHub project page at `/vexos/`), add `basePath` in `next.config.ts`.
- Facts shown on the site (name, GitHub links, default login) are in `src/lib/site.ts`.

## Layout

| Path | What it is |
|---|---|
| `src/app/page.tsx` | Landing page sections and its structured data |
| `src/app/docs/page.tsx` | Documentation |
| `src/app/layout.tsx` | Site metadata, header and footer, theme script |
| `src/app/globals.css` | Dark and light themes, matching the desktop |
| `src/app/sitemap.ts`, `robots.ts`, `manifest.ts` | Search and install metadata |
| `src/components/` | Header, footer, theme toggle |
| `public/` | Wallpaper, logo, and favicon files |
