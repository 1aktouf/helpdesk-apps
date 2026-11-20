import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password.js';
import { fail, ok } from './respond.js';
import { parse } from './validate.js';

export const SESSION_COOKIE = 'helpdesk.sid';

const UNIQUE_VIOLATION = '23505';
const email = z.email().max(254).transform((value) => value.toLowerCase());

const registerSchema = z.object({
  email,
  password: z.string().min(12).max(128),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

function toPublicUser({ id, email, role }) {
  return { id, email, role };
}

// New session id on every login/register, so a session id set before login can't be reused (session fixation).
function startSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

export function requireAuth(req, res, next) {
  if (!req.session.userId) return fail(res, 401, 'Not logged in');
  next();
}

// Role is read from the database on every request, so a demoted admin loses access at once.
export async function requireAdmin(req, res, next) {
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
  if (rows[0]?.role !== 'admin') return fail(res, 403, 'Admins only');
  next();
}

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { data, error } = parse(registerSchema, req.body);
  if (error) return fail(res, 400, error);

  const passwordHash = await hashPassword(data.password);
  let user;
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role',
      [data.email, passwordHash],
    );
    user = rows[0];
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) return fail(res, 409, 'An account with this email already exists');
    throw err;
  }

  await startSession(req, user.id);
  return ok(res, 201, toPublicUser(user));
});

authRouter.post('/login', async (req, res) => {
  const { data, error } = parse(loginSchema, req.body);
  if (error) return fail(res, 400, error);

  const { rows } = await pool.query(
    'SELECT id, email, role, password_hash FROM users WHERE lower(email) = $1',
    [data.email],
  );
  const user = rows[0];
  const passwordMatches = await verifyPassword(data.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !passwordMatches) return fail(res, 401, 'Invalid email or password');

  await startSession(req, user.id);
  return ok(res, 200, toPublicUser(user));
});

authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(SESSION_COOKIE, req.app.locals.sessionCookieOptions);
    res.status(204).end();
  });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [req.session.userId]);
  if (!rows[0]) {
    // Account was deleted while the session was alive.
    req.session.destroy(() => {
      res.clearCookie(SESSION_COOKIE, req.app.locals.sessionCookieOptions);
      fail(res, 401, 'Not logged in');
    });
    return;
  }
  return ok(res, 200, toPublicUser(rows[0]));
});
