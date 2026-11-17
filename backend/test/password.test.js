import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/password.js';

test('verifies the right password and rejects a wrong one', async () => {
  const stored = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('correct horse battery', stored), true);
  assert.equal(await verifyPassword('wrong password!!', stored), false);
});

test('a corrupted stored hash returns false instead of throwing', async () => {
  const stored = await hashPassword('correct horse battery');
  const corrupted = [
    'garbage',
    'scrypt$131072$8$1',
    stored.slice(0, -10), // truncated hash
    stored.replace('$131072$', '$abc$'),
    stored.replace('$131072$', '$3$'), // N not a power of two
  ];
  for (const value of corrupted) {
    assert.equal(await verifyPassword('correct horse battery', value), false, value);
  }
});
