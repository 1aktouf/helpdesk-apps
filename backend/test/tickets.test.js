import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PASSWORD, pool, startTestServer, uniqueEmail } from './helpers.js';

let call;
let stop;

const VALID_TICKET = { subject: 'Printer broken', category: 'technical', priority: 'high', description: 'It jams.' };

async function registerUser(label) {
  const email = uniqueEmail(label);
  const res = await call('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });
  return { email, cookie: res.cookie };
}

async function registerAdmin() {
  const admin = await registerUser('admin');
  await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [admin.email]);
  return admin;
}

before(async () => {
  ({ call, stop } = await startTestServer());
});

after(() => stop());

describe('unauthenticated access', () => {
  test('every ticket and admin endpoint returns 401 without a session', async () => {
    const requests = [
      ['GET', '/api/tickets'],
      ['POST', '/api/tickets'],
      ['GET', '/api/tickets/1'],
      ['GET', '/api/admin/tickets'],
      ['GET', '/api/admin/tickets/1'],
      ['PATCH', '/api/admin/tickets/1'],
    ];
    for (const [method, path] of requests) {
      const res = await call(path, { method, body: method === 'GET' ? undefined : VALID_TICKET });
      assert.equal(res.status, 401, `${method} ${path}`);
    }
  });
});

describe('user tickets', () => {
  test('a user creates a ticket and sees it in their own list', async () => {
    const user = await registerUser('owner');

    const created = await call('/api/tickets', { method: 'POST', body: VALID_TICKET, cookie: user.cookie });
    assert.equal(created.status, 201);
    assert.equal(created.json.data.status, 'open');
    assert.equal(created.json.data.ownerEmail, user.email);
    assert.deepEqual(created.json.data.comments, []);

    const list = await call('/api/tickets', { cookie: user.cookie });
    assert.equal(list.status, 200);
    assert.deepEqual(
      list.json.data.map((ticket) => ticket.id),
      [created.json.data.id],
    );
  });

  test("a user can't list or open someone else's ticket", async () => {
    const owner = await registerUser('owner2');
    const other = await registerUser('other');
    const created = await call('/api/tickets', { method: 'POST', body: VALID_TICKET, cookie: owner.cookie });

    const otherList = await call('/api/tickets', { cookie: other.cookie });
    assert.deepEqual(otherList.json.data, []);

    const otherOpen = await call(`/api/tickets/${created.json.data.id}`, { cookie: other.cookie });
    assert.equal(otherOpen.status, 404);
  });

  test('rejects invalid tickets with 400', async () => {
    const user = await registerUser('invalid');
    const badTickets = [
      { ...VALID_TICKET, subject: '   ' },
      { ...VALID_TICKET, subject: 'x'.repeat(121) },
      { ...VALID_TICKET, category: 'hacking' },
      { ...VALID_TICKET, priority: 'urgent' },
      { ...VALID_TICKET, description: 'x'.repeat(2001) },
      { ...VALID_TICKET, subject: ['array'] },
    ];
    for (const body of badTickets) {
      const res = await call('/api/tickets', { method: 'POST', body, cookie: user.cookie });
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 80));
    }
  });

  test('a non-numeric ticket id is 400, not 500', async () => {
    const user = await registerUser('badid');
    assert.equal((await call('/api/tickets/abc', { cookie: user.cookie })).status, 400);
  });
});

describe('admin', () => {
  test('a normal user gets 403 on every admin endpoint', async () => {
    const user = await registerUser('notadmin');
    assert.equal((await call('/api/admin/tickets', { cookie: user.cookie })).status, 403);
    const patch = await call('/api/admin/tickets/1', { method: 'PATCH', body: { status: 'closed' }, cookie: user.cookie });
    assert.equal(patch.status, 403);
  });

  test('an admin sees all tickets, updates status and replies; the owner sees the reply', async () => {
    const owner = await registerUser('customer');
    const admin = await registerAdmin();
    const created = await call('/api/tickets', { method: 'POST', body: VALID_TICKET, cookie: owner.cookie });
    const ticketId = created.json.data.id;

    const all = await call('/api/admin/tickets', { cookie: admin.cookie });
    assert.equal(all.status, 200);
    assert.ok(all.json.data.some((ticket) => ticket.id === ticketId && ticket.ownerEmail === owner.email));

    const updated = await call(`/api/admin/tickets/${ticketId}`, {
      method: 'PATCH',
      body: { status: 'in_progress', comment: 'Looking into it.' },
      cookie: admin.cookie,
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.json.data.status, 'in_progress');

    const seenByOwner = await call(`/api/tickets/${ticketId}`, { cookie: owner.cookie });
    assert.equal(seenByOwner.json.data.status, 'in_progress');
    assert.equal(seenByOwner.json.data.comments.length, 1);
    assert.equal(seenByOwner.json.data.comments[0].body, 'Looking into it.');
    assert.equal(seenByOwner.json.data.comments[0].authorRole, 'admin');
  });

  test('PATCH rejects an empty body, a bad status and a missing ticket', async () => {
    const admin = await registerAdmin();
    const owner = await registerUser('patchowner');
    const { json } = await call('/api/tickets', { method: 'POST', body: VALID_TICKET, cookie: owner.cookie });
    const path = `/api/admin/tickets/${json.data.id}`;

    assert.equal((await call(path, { method: 'PATCH', body: {}, cookie: admin.cookie })).status, 400);
    assert.equal((await call(path, { method: 'PATCH', body: { status: 'deleted' }, cookie: admin.cookie })).status, 400);
    const missing = await call('/api/admin/tickets/2147483647', {
      method: 'PATCH',
      body: { status: 'closed' },
      cookie: admin.cookie,
    });
    assert.equal(missing.status, 404);
  });

  test('a demoted admin loses access immediately', async () => {
    const admin = await registerAdmin();
    await pool.query("UPDATE users SET role = 'user' WHERE email = $1", [admin.email]);
    assert.equal((await call('/api/admin/tickets', { cookie: admin.cookie })).status, 403);
  });
});
