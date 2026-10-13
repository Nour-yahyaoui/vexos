# VexOS Desktop: developer ecosystem plan (draft)

Status: plan only. Nothing here is built yet. The current ISO build comes first.

## Principles

1. **Finish the base first.** The ISO must build, boot in VirtualBox, and pass the acceptance test before anything below is added.
2. **Separate profiles.** Desktop stays small. Extra tools go in a `dev` profile (`profiles/dev.list` plus a hook), and a `security` profile for the scanners.
3. **Check every package in trixie before adding it.** Debian trixie has `nmap` in `main`, `nikto` only in `non-free`, and no `zaproxy` or `wapiti`.
4. **Every ISO over 2 GB is split for the GitHub release** (see the release steps).
5. **Each feature is tested in a VM** before it's called done.

## Phase 1: developer essentials (apt, `dev` profile)

| Need | Packages (trixie) | Why |
|---|---|---|
| Version control | `git`, `git-lfs`, `git-delta`, `gh` (verify in trixie) | Daily git work and GitHub CLI |
| Databases | `sqlite3`, `postgresql`, `redis-server` | Local backends, started on demand |
| HTTP and APIs | `curl`, `httpie`, `jq`, `yq` | Test endpoints from the terminal |
| Code quality | `shellcheck`, `clang-format`, `clang-tidy` | Lint C and shell code |
| Runtimes | `golang-go`, `default-jdk-headless` (verify) | More languages for students and devs |
| Debugging | `gdb`, `valgrind`, `strace`, `htop` | Already partly installed, make it complete |
| Docs | `pandoc` | Convert and build docs |

## Phase 2: JavaScript and web toolchain (npm, global, from a hook)

- `pnpm`, `yarn` (via corepack), `typescript`, `eslint`, `prettier`
- `playwright` with Firefox, for browser tests (check the Firefox ESR path)
- `lighthouse` for page speed and SEO audits
- `vercel`, `netlify-cli` for deploys
- Templates in DevStudio: Vite, Astro, SvelteKit (later)

Note: Bun and Deno are not in trixie. Install them from upstream only if you want them. This needs a network step during the build.

## Phase 3: VexSec, the security test tool

### What it does (in scope)

Scans targets you have proven you own:

- **Passive checks:** security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options), cookie flags (Secure, HttpOnly, SameSite), CORS settings, server version disclosure, directory listing, exposed files (`.env`, `.git/`, backup files).
- **TLS checks:** protocol versions, certificate expiry, weak ciphers (`testssl.sh` or `sslscan`, to verify in trixie).
- **Port and service scan:** `nmap` (in trixie `main`) with a conservative default profile.
- **Report:** HTML and JSON, with a severity and a fix hint for each finding.

### Target rules (built in, not optional)

- Allowed without extra steps: `localhost`, `127.0.0.1`, `::1`, and the VM's own address.
- Any other host (LAN or public) needs ownership proof: a file served at `/.well-known/vexsec.txt` that contains a token shown by VexSec. Without the proof, the scan does not start.
- Rate limit and a scan timeout are on by default. Destructive checks are off.
- Every scan is logged with the time, target, and profile.

### Out of scope (will not be built)

- Automatic exploitation or "penetrating" a server.
- Password guessing or brute force.
- Denial-of-service tests.
- Data extraction or SQL injection tools aimed at a target.
- Scanning hosts without ownership proof.

For learning how attacks work, use a **lab** instead (Phase 4).

### Deliverables

- `vexsec` CLI: `vexsec scan http://localhost:3000`, `vexsec verify example.com`, `vexsec report last`.
- DevStudio panel: "Security" tab that runs the scan on the current project's URL and shows the report.
- nikto is optional and non-free. Add it only if you accept the non-free package.

## Phase 4: security lab (learning, offline)

- **OWASP Juice Shop** (npm package `juice-shop`) and **DVWA** (PHP), run only on localhost, to practise web security legally.
- A `vexlab` command that starts one of them and prints the URL.
- Check that Juice Shop starts from npm inside the live session before adding it.

## Phase 5: VexOS tooling and docs

- `vexos` command: `vexos new web`, `vexos new api`, `vexos doctor` (checks the installed tools and versions).
- Tutorials in the docs: backend with Postgres, testing with Playwright, first security scan.
- Versioned release notes per profile.

## Build and size impact (estimate, to measure)

- `dev` profile: adds several hundred MB. Measure after the first build.
- `security` profile: `nmap` plus helpers, small.
- Lab: npm packages are downloaded at first run, so they add nothing to the ISO.

## Decisions needed from you

1. Which phases come first? Suggested order: Phase 1, then Phase 3, then Phase 2.
2. Should VexSec's port scans be on by default for localhost only, or should they always need the ownership proof?
3. Is nikto (non-free) acceptable for the security profile, or should we skip it?
4. Should Postgres and Redis start automatically at boot, or only when you run them?
