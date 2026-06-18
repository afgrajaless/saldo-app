import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Configuracion de Drizzle Kit para generar y aplicar migraciones.
 * Las migraciones SQL se generan en ./drizzle a partir de src/db/schema.ts.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
