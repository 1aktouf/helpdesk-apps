// Shared setup for API tests. Needs Postgres running: `docker compose up -d db` from the repo root.
import { createApp } from '../src/app.js';
import { pool } from '../src/db.js';

const TEST_EMAIL_DOMAIN = '@api-test.example';

export const PASSWORD = 'correct horse battery';

export const uniqueEmail = (label) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}${TEST_EMAIL_DOMAIN}`;

export { pool };

// Starts the real app on a random port. `stop` deletes every test user (tickets and comments cascade).
export async function startTestServer() {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function call(path, { method = 'GET', body, cookie } = {}) {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (cookie) headers.cookie = cookie;
    const res = await fetch(baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    return {
      status: res.status,
      json: res.status === 204 ? null : await res.json(),
      setCookie,
      cookie: setCookie?.split(';')[0],
    };
  }

  async function stop() {
    await new Promise((resolve) => server.close(resolve));
    await app.locals.sessionStore.close();
    await pool.query('DELETE FROM users WHERE email LIKE $1', [`%${TEST_EMAIL_DOMAIN}`]);
    await pool.end();
  }

  return { baseUrl, call, stop };
}
