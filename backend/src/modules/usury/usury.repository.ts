import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, SQL } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { usuryRates, usuryModalityEnum } from '../../db/schema';

/** Fila del catalogo de usura. */
export type UsuryRateRow = typeof usuryRates.$inferSelect;
/** Modalidad de usura (enum de la BD). */
export type UsuryModality = (typeof usuryModalityEnum.enumValues)[number];

/**
 * Repositorio del catalogo de tasas de usura. Solo lectura desde la API; la
 * carga del catalogo se hace por seed (reference data).
 */
@Injectable()
export class UsuryRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Busca la tasa de usura vigente para una modalidad en una fecha dada.
   * @param modality - Modalidad de usura.
   * @param date - Fecha a evaluar (YYYY-MM-DD).
   * @returns La tasa vigente, o `undefined` si no hay ninguna para ese periodo.
   */
  async findCurrent(modality: UsuryModality, date: string): Promise<UsuryRateRow | undefined> {
    const [rate] = await this.db
      .select()
      .from(usuryRates)
      .where(
        and(
          eq(usuryRates.modality, modality),
          lte(usuryRates.validFrom, date),
          gte(usuryRates.validTo, date),
        ),
      )
      .orderBy(desc(usuryRates.validFrom))
      .limit(1);
    return rate;
  }

  /**
   * Lista las tasas del catalogo, opcionalmente filtradas por modalidad.
   * @param modality - Modalidad a filtrar (opcional).
   * @returns Las tasas, de la vigencia mas reciente a la mas antigua.
   */
  async findAll(modality?: UsuryModality): Promise<UsuryRateRow[]> {
    const filter: SQL | undefined = modality ? eq(usuryRates.modality, modality) : undefined;
    return this.db
      .select()
      .from(usuryRates)
      .where(filter)
      .orderBy(desc(usuryRates.validFrom));
  }
}
