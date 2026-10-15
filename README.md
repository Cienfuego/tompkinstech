# tompkinstech.com

Self-hosted portfolio + single-user admin dashboard (site monitoring and
photo management), designed to run on a home box (e.g. a Lenovo X230)
behind a Cloudflare Tunnel.

## Stack

- **App**: Astro (`output: 'server'`, Node adapter, standalone mode) + Tailwind CSS 4.
  Public pages (`/`, `/projects`) are prerendered static HTML; `/photos`
  and everything under `/admin` render per-request.
- **DB**: Postgres, via Docker, holding the monitored sites, their check
  history, and uploaded-photo metadata.
- **Auth**: single hardcoded admin account — a bcrypt password hash in an
  env var, a signed session cookie. No sign-up, no password reset.
- **Worker**: a small standalone Node process that pings the monitored
  sites on an interval, writes results to Postgres, and emails an alert
  (via AWS SES) the moment a site flips from up to not-up.
- **Exposure**: Cloudflare Tunnel (optional `cloudflared` service in
  compose) — no inbound ports opened on your home network.

## Layout

```
app/        Astro site (pages, components, admin area, photo upload API)
worker/     Standalone monitoring worker (no build step, plain JS)
db/         init.sql — schema + seed data, run automatically on first boot
docker-compose.yml
.env.example
```

## First-time setup

1. **Copy the env file and fill it in:**
   ```
   cp .env.example .env
   ```
   - `POSTGRES_PASSWORD` — anything random.
   - `SESSION_SECRET` — a long random string (`openssl rand -hex 32`).
   - `ADMIN_PASSWORD_HASH` — generate after `npm install` in `app/`:
     ```
     cd app && npm install
     node scripts/hash-password.mjs 'your-real-password'
     ```
     Paste the printed hash into `.env`. The plaintext password is never
     stored anywhere.
   - `ALERT_EMAIL_TO` / `ALERT_EMAIL_FROM` — where alerts go, and the SES-verified
     sender address (reuse the one already verified for Healthgarden if that's
     easiest).
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` — credentials for
     an IAM user/role scoped to `ses:SendEmail` only.
   - `CLOUDFLARE_TUNNEL_TOKEN` — only needed once you've created a tunnel in the
     Cloudflare Zero Trust dashboard and pointed it at `http://app:4321`.

2. **Build and start the core services:**
   ```
   docker compose up -d --build
   ```
   This starts Postgres (seeded from `db/init.sql` with the three monitored
   sites), the app on port 4321, and the monitoring worker.

3. **Start the tunnel once you have a token:**
   ```
   docker compose --profile tunnel up -d
   ```
   (Left out of the default `up` so the rest of the stack runs fine before
   you've set up Cloudflare.)

4. Visit `http://<x230-ip>:4321` to confirm it's up, then the tunnel's
   hostname once that's wired, then `tompkinstech.com` once DNS points at it.

## DNS note

Since Cloudflare Tunnel is doing the exposing, the simplest setup is to
register the domain in Route 53 (registrar only) but point its nameservers
at Cloudflare, so Cloudflare's free DNS can create the proxied record the
tunnel needs. That also means you likely don't need a paid Route 53 hosted
zone at all — just the registration fee.

## What's simplified from the mockup, for now

- Admin login is password-only (the mockup showed an email field too;
  there's only one account, so email serves no purpose yet).
- The Admin dashboard's Monitoring/Photos tabs are two real pages
  (`/admin`, `/admin/photos`) rather than a client-side toggle — simpler,
  and avoids shipping JS for something Astro's routing already does.
- Photo uploads are stored on disk in a Docker volume and served through
  a small streaming endpoint (`/uploads/[filename]`) rather than Astro's
  static asset pipeline, since files need to persist and be added after
  the app is built.
- The home page's "currently monitoring" teaser is static copy, not a
  live query — the real numbers live at `/admin`.

## Next passes (not yet built)

- Real content: résumé file, headshot/photo, project links.
- TLS cert renewal is handled by Cloudflare, so nothing to do there.
- Backups for the Postgres volume and the uploads volume.
