import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db.js';
import { authRouter, requireAdmin, requireAuth, SESSION_COOKIE } from './auth.js';
import { adminRouter, ticketsRouter } from './tickets.js';
import { fail } from './respond.js';

const MIN_SECRET_LENGTH = 32;
const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours, refreshed on each request
const JSON_BODY_LIMIT = '10kb';

const PgSession = connectPgSimple(session);

export function createApp() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`SESSION_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters`);
  }
  const secureCookie = process.env.COOKIE_SECURE === 'true';

  const app = express();
  // Behind HTTPS the TLS proxy talks to us over plain HTTP; trust its X-Forwarded-Proto so Secure cookies are sent.
  if (secureCookie) app.set('trust proxy', 1);

  const sessionCookieOptions = { httpOnly: true, sameSite: 'strict', secure: secureCookie };
  app.locals.sessionCookieOptions = sessionCookieOptions;
  app.locals.sessionStore = new PgSession({ pool });

  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(
    session({
      name: SESSION_COOKIE,
      secret,
      store: app.locals.sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: { ...sessionCookieOptions, maxAge: SESSION_MAX_AGE_MS },
    }),
  );

  app.use('/api/auth', authRouter);
  app.use('/api/tickets', requireAuth, ticketsRouter);
  app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
  app.use('/api', (req, res) => fail(res, 404, 'Not found'));

  // Express 5 sends rejected async handlers here too.
  app.use((err, req, res, _next) => {
    if (err.expose && err.status < 500) return fail(res, err.status, err.message); // e.g. malformed JSON, body too large
    console.error(`${req.method} ${req.originalUrl} failed:`, err);
    return fail(res, 500, 'Internal server error');
  });

  return app;
}
