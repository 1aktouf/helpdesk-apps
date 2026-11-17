import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set (see .env.example)');
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Without a listener, an idle connection dropped by Postgres crashes the whole process.
pool.on('error', (err) => console.error('Postgres pool error:', err));
