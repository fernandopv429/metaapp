import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

// Required format from prompt, now loaded from env or fallback
const BASE_CONNECTION_STRING = process.env.DATABASE_URL || "postgres://postgres:8rn7UAYY91tynjOsknyKomdLrN60j6G26H4VuDpXdBL3XBeHkgQXN9dYwBPZ0XEh@72.60.61.18:5432/postgres";

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
