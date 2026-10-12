# VexOS website

The landing page and documentation for VexOS Desktop, built with Next.js (App Router) and exported as static files.

Pages: `/` (landing), `/docs/` (documentation). The site has SEO metadata, Open Graph and Twitter cards, JSON-LD, `sitemap.xml`, `robots.txt`, a web manifest, and favicons.

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

## Before you deploy

- Set the public address so canonical links, the sitemap, and social cards point to the right place:
  `NEXT_PUBLIC_SITE_URL=https://your-domain.example npm run build`
  The default is `https://nour-yahyaoui.github.io`.
- The site lives at the root path. If you host it at a subpath (for example a GitHub project page at `/vexos/`), add `basePath` in `next.config.ts`.
- Facts shown on the site (name, GitHub links, default login) are in `src/lib/site.ts`.

## Layout

| Path | What it is |
|---|---|
| `src/app/page.tsx` | Landing page and its structured data |
| `src/app/docs/page.tsx` | Documentation |
| `src/app/layout.tsx` | Site metadata, header and footer, theme script |
| `src/app/globals.css` | Dark and light themes, matching the desktop |
| `src/app/sitemap.ts`, `robots.ts`, `manifest.ts` | Search and install metadata |
| `src/components/` | Header, footer, theme toggle |
| `public/` | Wallpaper, logo, and favicon files |
