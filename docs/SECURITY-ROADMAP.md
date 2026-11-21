# Security and backend roadmap

## Current baseline

- The static Phaser/Vite client remains deployable as before.
- The Vercel Node.js Function surface begins with a read-only GET /api/health endpoint.
- The health endpoint is stateless, does not read environment variables, accepts no user input, and exposes no deployment metadata or secrets.
- Production responses receive a restrictive Content Security Policy and browser security headers.
- No database, authentication, player profile, ranking write, or persistent session has been introduced. This avoids unused credentials or state in a game that currently runs entirely in the browser.

## Security controls already applied

- Content Security Policy: same-origin scripts and connections; no objects, embeds, or framing. Inline styles remain allowed only because the entry document currently contains a small inline style block.
- HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options, and cross-origin resource isolation headers.
- Health endpoint uses Cache-Control no-store, a fixed response schema, and no permissive CORS policy.
- API method surface is read-only: GET, HEAD, OPTIONS.

## Growth path — add controls with the corresponding feature

1. Player identity/accounts: use established OIDC, secure HttpOnly/Secure/SameSite cookies, short-lived sessions, CSRF protection for mutations, and server-side authorization on every protected operation. Never trust a player ID supplied by the browser.
2. Rankings/saved progress: add a managed database with migrations, least-privilege credentials, parameterized queries, schema validation, ownership checks, and retention/deletion policies. Do not store game state in serverless process memory.
3. Competitive integrity: validate score submissions server-side, cap payload sizes, apply per-account and per-IP rate limits backed by a shared store, use idempotency keys, and flag impossible times/speeds. Client-side scores are untrusted.
4. Multiplayer/matchmaking: use authenticated realtime connections, message schemas, server-authoritative match state, replay/anti-cheat checks, and abuse controls. Do not use an in-memory map as a durable room registry.
5. Operations: add structured request IDs, error monitoring, audit events for privileged actions, dependency scanning, secret scanning, automated security tests, and a documented incident/backup process.

The next control should be introduced when its feature exists. Do not add a database or authentication provider merely to claim that the game has a backend; an unused integration increases the attack surface without protecting anything.