import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

// Required format from prompt, now loaded exclusively from env
const BASE_CONNECTION_STRING = process.env.DATABASE_URL;

if (!BASE_CONNECTION_STRING) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Note: In Python it was asked to convert to postgresql+asyncpg://
// In Node.js, `pg` driver requires the standard postgres:// connection string, 
// so we use it directly.

export const pool = new pg.Pool({
  connectionString: BASE_CONNECTION_STRING,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });
