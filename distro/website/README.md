# VexOS landing page

A static, mobile-responsive landing page for VexOS Desktop. No build step and no framework.

## Files

- `index.html`: page structure. It has no icon markup. Icons are placeholders such as `<span data-icon="download">`.
- `icons.js`: the icon set. Add or change icons here.
- `site.js`: the content. The `SITE`, `FEATURES`, `STEPS`, and `REQUIREMENTS` objects at the top hold all text and links.
- `styles.css`: layout and theme. Mobile first, with breakpoints at 720px and 960px.
- `assets/logo.png`: copy of the VexOS v2 logo.

## Change the author, repo, or download link

Edit the `SITE` object in `site.js`. For example, set `author` to your real name and `download` to the release page.

## Preview locally

    cd distro/website
    python3 -m http.server 8080

Open http://localhost:8080. Check the layout at phone width in the browser's device mode.

## Publish

Any static host works. Upload this folder to GitHub Pages, Netlify, or Cloudflare Pages.
