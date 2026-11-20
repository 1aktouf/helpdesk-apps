# HelpDesk API

Express 5 and PostgreSQL. Logins use a server side session stored in Postgres and sent to the browser as an HttpOnly cookie called `helpdesk.sid`.

## Run it

From the repo root:

```bash
cp .env.example .env   # then put real random values in both secrets
docker compose up -d --build
```

The API is on http://127.0.0.1:3000. The database schema lives in `db/schema.sql` and only runs when the database volume is first created. After changing it, run `docker compose down -v` (this wipes all data).

## Tests

```bash
docker compose up -d db
cd backend && npm install && npm test
```

## For the frontend

Call the API from the same origin so the cookie is sent. In development add a proxy to `vite.config.js`:

```js
server: { proxy: { '/api': 'http://127.0.0.1:3000' } }
```

Send JSON with `content-type: application/json`. Every response looks like this:

```json
{ "success": true, "data": { }, "error": null }
```

On failure `success` is false, `data` is null and `error` is a message you can show the user.

## Endpoints

| Method | Path | Body | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | /api/auth/register | email, password (12 to 128) | 201 user, logged in | 400 invalid input, 409 email taken |
| POST | /api/auth/login | email, password | 200 user | 400, 401 wrong email or password |
| POST | /api/auth/logout | none | 204 | none |
| GET | /api/auth/me | none | 200 user | 401 not logged in |

| GET | /api/tickets | none | 200 your tickets, newest first | 401 |
| POST | /api/tickets | subject (1 to 120), category, priority, description (1 to 2000) | 201 ticket | 400, 401 |
| GET | /api/tickets/:id | none | 200 ticket with comments | 401, 404 (also for other people's tickets) |
| GET | /api/admin/tickets | none | 200 all tickets, newest first | 401, 403 |
| GET | /api/admin/tickets/:id | none | 200 ticket with comments | 401, 403, 404 |
| PATCH | /api/admin/tickets/:id | status and/or comment (1 to 2000) | 200 updated ticket with comments | 400, 401, 403, 404 |

A user looks like `{ "id": 1, "email": "alice@example.com", "role": "user" }`. Role is `user` or `admin`.

Allowed values: category is `technical`, `billing`, `account` or `other`. Priority is `low`, `medium` or `high`. Status is `open`, `in_progress`, `resolved` or `closed`. New tickets start as `open`.

A ticket looks like this. Lists leave out `comments`.

```json
{
  "id": 1, "subject": "Printer broken", "category": "technical", "priority": "high",
  "description": "It jams.", "status": "in_progress", "ownerEmail": "alice@example.com",
  "createdAt": "2026-11-17T10:00:00.000Z", "updatedAt": "2026-11-17T10:05:00.000Z",
  "comments": [
    { "id": 1, "body": "Looking into it.", "authorEmail": "admin@example.com", "authorRole": "admin", "createdAt": "2026-11-17T10:05:00.000Z" }
  ]
}
```

## Making an admin

Register normally, then promote that account:

```bash
docker compose exec db psql -U helpdesk -d helpdesk -c "UPDATE users SET role = 'admin' WHERE email = 'admin@example.com'"
```
