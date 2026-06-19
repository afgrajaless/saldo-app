import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema, usuryRates } from '../schema';

/**
 * Catalogo de tasas de usura (Superfinanciera de Colombia).
 *
 * IMPORTANTE: los valores son ILUSTRATIVOS para el MVP. La tasa de usura la
 * certifica la Superfinanciera por modalidad y periodo (usura = IBC * 1.5) y
 * cambia periodicamente; deben actualizarse desde la fuente oficial.
 * Tasas en Efectiva Anual como fraccion decimal (0.2674 = 26.74 %).
 */
const USURY_SEED: (typeof usuryRates.$inferInsert)[] = [
  // Consumo y ordinario
  { modality: 'consumo_ordinario', effectiveAnnualRate: '0.281200', validFrom: '2025-10-01', validTo: '2025-12-31' },
  { modality: 'consumo_ordinario', effectiveAnnualRate: '0.267400', validFrom: '2026-01-01', validTo: '2026-03-31' },
  { modality: 'consumo_ordinario', effectiveAnnualRate: '0.265000', validFrom: '2026-04-01', validTo: '2026-06-30' },
  // Microcredito
  { modality: 'microcredito', effectiveAnnualRate: '0.415000', validFrom: '2026-01-01', validTo: '2026-06-30' },
  // Consumo de bajo monto
  { modality: 'consumo_bajo_monto', effectiveAnnualRate: '0.500000', validFrom: '2026-01-01', validTo: '2026-06-30' },
];

/**
 * Carga (idempotente) el catalogo de usura: vacia la tabla y la repuebla.
 * Uso: `npm run db:seed`.
 */
async function seed(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL no esta definida.');
  }
  const client = postgres(connectionString, { max: 1, ssl: 'require' });
  const db = drizzle(client, { schema });
  await db.delete(usuryRates);
  await db.insert(usuryRates).values(USURY_SEED);
  // eslint-disable-next-line no-console
  console.log(`Catalogo de usura cargado: ${USURY_SEED.length} tasas.`);
  await client.end();
}

void seed();
