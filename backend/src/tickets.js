import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db.js';
import { fail, ok } from './respond.js';
import { parse } from './validate.js';

// shortcut: lists return the newest 200 rows with no pagination; add page/limit params if the demo data ever grows past that.
const LIST_LIMIT = 200;

const TICKET_COLUMNS = `t.id, t.subject, t.category, t.priority, t.description, t.status,
  u.email AS "ownerEmail", t.created_at AS "createdAt", t.updated_at AS "updatedAt"`;

const createTicketSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  category: z.enum(['technical', 'billing', 'account', 'other']),
  priority: z.enum(['low', 'medium', 'high']),
  description: z.string().trim().min(1).max(2000),
});

const updateTicketSchema = z
  .object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
    comment: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((body) => body.status !== undefined || body.comment !== undefined, {
    message: 'send a status, a comment, or both',
  });

const ticketIdSchema = z.coerce.number().int().positive().max(2 ** 31 - 1);

async function findTicketWithComments(ticketId) {
  const { rows } = await pool.query(
    `SELECT ${TICKET_COLUMNS}, t.user_id AS "ownerId" FROM tickets t JOIN users u ON u.id = t.user_id WHERE t.id = $1`,
    [ticketId],
  );
  if (!rows[0]) return null;
  const { rows: comments } = await pool.query(
    `SELECT c.id, c.body, u.email AS "authorEmail", u.role AS "authorRole", c.created_at AS "createdAt"
     FROM ticket_comments c JOIN users u ON u.id = c.user_id
     WHERE c.ticket_id = $1 ORDER BY c.created_at`,
    [ticketId],
  );
  const { ownerId, ...ticket } = rows[0];
  return { ownerId, ticket: { ...ticket, comments } };
}

// --- /api/tickets: any logged-in user, only their own tickets ---
export const ticketsRouter = Router();

ticketsRouter.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${TICKET_COLUMNS} FROM tickets t JOIN users u ON u.id = t.user_id
     WHERE t.user_id = $1 ORDER BY t.created_at DESC LIMIT ${LIST_LIMIT}`,
    [req.session.userId],
  );
  return ok(res, 200, rows);
});

ticketsRouter.post('/', async (req, res) => {
  const { data, error } = parse(createTicketSchema, req.body);
  if (error) return fail(res, 400, error);

  const { rows } = await pool.query(
    `INSERT INTO tickets (user_id, subject, category, priority, description)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [req.session.userId, data.subject, data.category, data.priority, data.description],
  );
  const { ticket } = await findTicketWithComments(rows[0].id);
  return ok(res, 201, ticket);
});

ticketsRouter.get('/:id', async (req, res) => {
  const { data: ticketId, error } = parse(ticketIdSchema, req.params.id);
  if (error) return fail(res, 400, error);

  const found = await findTicketWithComments(ticketId);
  // Someone else's ticket gets the same 404 as a missing one, so ids can't be probed.
  if (!found || found.ownerId !== req.session.userId) return fail(res, 404, 'Ticket not found');
  return ok(res, 200, found.ticket);
});

// --- /api/admin: admins only (requireAdmin is applied where this router is mounted) ---
export const adminRouter = Router();

adminRouter.get('/tickets', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${TICKET_COLUMNS} FROM tickets t JOIN users u ON u.id = t.user_id
     ORDER BY t.created_at DESC LIMIT ${LIST_LIMIT}`,
  );
  return ok(res, 200, rows);
});

adminRouter.get('/tickets/:id', async (req, res) => {
  const { data: ticketId, error } = parse(ticketIdSchema, req.params.id);
  if (error) return fail(res, 400, error);

  const found = await findTicketWithComments(ticketId);
  if (!found) return fail(res, 404, 'Ticket not found');
  return ok(res, 200, found.ticket);
});

adminRouter.patch('/tickets/:id', async (req, res) => {
  const { data: ticketId, error: idError } = parse(ticketIdSchema, req.params.id);
  if (idError) return fail(res, 400, idError);
  const { data, error } = parse(updateTicketSchema, req.body);
  if (error) return fail(res, 400, error);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      'UPDATE tickets SET status = COALESCE($2, status), updated_at = now() WHERE id = $1',
      [ticketId, data.status ?? null],
    );
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return fail(res, 404, 'Ticket not found');
    }
    if (data.comment) {
      await client.query('INSERT INTO ticket_comments (ticket_id, user_id, body) VALUES ($1, $2, $3)', [
        ticketId,
        req.session.userId,
        data.comment,
      ]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const { ticket } = await findTicketWithComments(ticketId);
  return ok(res, 200, ticket);
});
