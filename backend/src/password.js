import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// OWASP Password Storage Cheat Sheet scrypt minimum: N=2^17, r=8, p=1.
const COST = 2 ** 17;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const MAX_MEMORY = 256 * 1024 * 1024; // N=2^17, r=8 needs 128 MiB; Node's default cap is 32 MiB

function derive(password, salt, N, r, p) {
  return scryptAsync(password, salt, KEY_LENGTH, { N, r, p, maxmem: MAX_MEMORY });
}

// Stored as scrypt$N$r$p$salt$hash so the cost can be raised later without breaking old hashes.
export async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const hash = await derive(password, salt, COST, BLOCK_SIZE, PARALLELISM);
  return ['scrypt', COST, BLOCK_SIZE, PARALLELISM, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const [algorithm, N, r, p, salt, hash] = stored.split('$');
  const params = [N, r, p].map(Number);
  // A corrupted row means "wrong password", not a 500.
  if (algorithm !== 'scrypt' || !salt || !hash || !params.every(Number.isSafeInteger)) return false;
  const expected = Buffer.from(hash, 'base64');
  if (expected.length !== KEY_LENGTH) return false;
  try {
    const actual = await derive(password, Buffer.from(salt, 'base64'), ...params);
    return timingSafeEqual(actual, expected);
  } catch {
    return false; // scrypt rejects out-of-range N/r/p
  }
}

// Checked against when the email is unknown, so a login takes the same time either way (no user enumeration by timing).
export const DUMMY_HASH = await hashPassword(randomBytes(SALT_BYTES).toString('hex'));
