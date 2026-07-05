import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://postgres:8rn7UAYY91tynjOsknyKomdLrN60j6G26H4VuDpXdBL3XBeHkgQXN9dYwBPZ0XEh@72.60.61.18:5432/postgres",
  },
});
