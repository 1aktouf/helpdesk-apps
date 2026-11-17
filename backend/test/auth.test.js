import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PASSWORD, startTestServer, uniqueEmail } from './helpers.js';

let baseUrl;
let call;
let stop;

before(async () => {
  ({ baseUrl, call, stop } = await startTestServer());
});

after(() => stop());

describe('register', () => {
  test('creates a user, logs them in, and never returns the password hash', async () => {
    const email = uniqueEmail('reg');
    const res = await call('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });

    assert.equal(res.status, 201);
    assert.deepEqual(Object.keys(res.json.data).sort(), ['email', 'id', 'role']);
    assert.equal(res.json.data.role, 'user');
    assert.match(res.setCookie, /^helpdesk\.sid=/);
    assert.match(res.setCookie, /HttpOnly/);
    assert.match(res.setCookie, /SameSite=Strict/);

    const me = await call('/api/auth/me', { cookie: res.cookie });
    assert.equal(me.status, 200);
    assert.equal(me.json.data.email, email);
  });

  test('rejects a duplicate email regardless of case', async () => {
    const email = uniqueEmail('dup');
    await call('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });
    const res = await call('/api/auth/register', {
      method: 'POST',
      body: { email: email.toUpperCase(), password: PASSWORD },
    });
    assert.equal(res.status, 409);
    assert.equal(res.json.success, false);
  });

  test('rejects short or overlong passwords and bad emails', async () => {
    const cases = [
      { email: uniqueEmail('short'), password: 'short' },
      { email: 'not-an-email', password: PASSWORD },
      { email: uniqueEmail('long'), password: 'x'.repeat(129) },
    ];
    for (const body of cases) {
      const res = await call('/api/auth/register', { method: 'POST', body });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  test('rejects malformed JSON with 400, not 500', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad json',
    });
    assert.equal(res.status, 400);
  });
});

describe('login', () => {
  test('wrong password and unknown email give the same 401 message', async () => {
    const email = uniqueEmail('login');
    await call('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });

    const wrongPassword = await call('/api/auth/login', { method: 'POST', body: { email, password: 'wrong password!!' } });
    const unknownEmail = await call('/api/auth/login', {
      method: 'POST',
      body: { email: uniqueEmail('nobody'), password: PASSWORD },
    });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(wrongPassword.json.error, unknownEmail.json.error);
  });

  test('issues a new session id on login and the old one stops working', async () => {
    const email = uniqueEmail('fixation');
    const registered = await call('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });

    const loggedIn = await call('/api/auth/login', {
      method: 'POST',
      body: { email, password: PASSWORD },
      cookie: registered.cookie,
    });
    assert.equal(loggedIn.status, 200);
    assert.notEqual(loggedIn.cookie, registered.cookie);

    assert.equal((await call('/api/auth/me', { cookie: registered.cookie })).status, 401);
    assert.equal((await call('/api/auth/me', { cookie: loggedIn.cookie })).status, 200);
  });
});

describe('logout and protected routes', () => {
  test('/me without a session is 401', async () => {
    assert.equal((await call('/api/auth/me')).status, 401);
  });

  test('logout destroys the session server-side', async () => {
    const email = uniqueEmail('logout');
    const { cookie } = await call('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });

    const res = await call('/api/auth/logout', { method: 'POST', cookie });
    assert.equal(res.status, 204);
    assert.equal((await call('/api/auth/me', { cookie })).status, 401);
  });

  test('unknown API routes return a JSON 404', async () => {
    const res = await call('/api/nope');
    assert.equal(res.status, 404);
    assert.equal(res.json.success, false);
  });
});
