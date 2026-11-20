# HelpDesk

A support ticket / helpdesk web app built for the CMP-X306 Secure Software Development group project. Users submit support tickets; admins triage them, update their status, and leave comments. Built as a two-part app: a React frontend and an Express/PostgreSQL backend, with security hardening layered on for the module's assessment (HTTPS, hardened session cookies, security headers, input validation).

## What it does

- **Register / log in** with email + password (server-side sessions, `httpOnly` cookie)
- **Submit a ticket** with a subject, category, priority, and description
- **My Tickets** — view your own submitted tickets and their status
- **Admin dashboard** — admins see every ticket, update its status, and add comments
- Full API reference (endpoints, request/response shapes, error codes) is in [`backend/README.md`](./backend/README.md)

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19, React Router, Vite |
| Backend | Express 5, `express-session` + `connect-pg-simple` (sessions stored in Postgres) |
| Database | PostgreSQL 17 |
| Security | `helmet` (security headers), self-signed TLS for local HTTPS, `zod` input validation |
| Infra | Docker Compose (db + backend); frontend runs via Vite's dev server |

## Project layout

```
helpdesk-apps/
├── src/              # React frontend (pages, AuthContext, API client)
├── backend/          # Express API — see backend/README.md for endpoints
├── certs/            # Self-signed TLS cert/key for local HTTPS (generated, gitignored)
├── docker-compose.yml
├── vite.config.js    # Vite dev server: HTTPS + /api proxy to the backend
└── .env.example      # Template for required secrets
```

## Running it locally

### 1. Set up secrets

```bash
cp .env.example .env
```

Open `.env` and replace both placeholders with real random values:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use this to generate `POSTGRES_PASSWORD` and `SESSION_SECRET` (run it twice, once per secret). Never commit `.env`.

### 2. Generate a local TLS certificate

The frontend serves over HTTPS in dev. Generate a self-signed cert once:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/localhost-key.pem -out certs/localhost-cert.pem \
  -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

Your browser will show a "Not Secure" / self-signed warning for `localhost` — that's expected for local dev; click through it.

Once your cert is in place, set `COOKIE_SECURE=true` in `.env` so session cookies get the `Secure` flag.

### 3. Start the database + backend

```bash
docker compose up -d --build
```

This starts Postgres and the Express API (`http://127.0.0.1:3000`, not meant to be hit directly — the frontend proxies to it).

### 4. Start the frontend

```bash
npm install
npm run dev
```

Open **https://localhost:5173**.

### 5. (Optional) Make yourself an admin

Register an account in the app, then:

```bash
docker compose exec db psql -U helpdesk -d helpdesk -c "UPDATE users SET role = 'admin' WHERE email = 'you@example.com';"
```

Reload the page — an **Admin** link will appear in the nav.

## Notes

- If you change `.env` (e.g. flipping `COOKIE_SECURE`), run `docker compose up -d` again to recreate the backend container with the new values — env vars are only read at container start.
- `certs/` and `.env` are gitignored — each teammate generates their own locally; never commit either.
- See [`backend/README.md`](./backend/README.md) for the full API reference and running backend tests.
