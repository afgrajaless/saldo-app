import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { accounts, categories, transactions, transfers } from '../../db/schema';
import { ParsedImport } from './import.mapper';

/** Resumen del resultado de una importacion. */
export interface ImportResult {
  transactions: number;
  transfers: number;
  accountsCreated: number;
  categoriesCreated: number;
  skipped: ParsedImport['skipped'];
}

/** Tipo de transaccion de Drizzle dentro de db.transaction. */
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Paleta de colores hex para distinguir las cuentas/categorias creadas. */
const IMPORT_PALETTE = [
  '#2D6FB0', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
  '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#84CC16', '#A855F7',
];

/** Devuelve un color de la paleta segun el indice (ciclico). */
function paletteColor(index: number): string {
  return IMPORT_PALETTE[index % IMPORT_PALETTE.length];
}

/**
 * Persiste un import completo en una sola transaccion: resuelve (o crea) las
 * cuentas y categorias necesarias y luego inserta movimientos y transferencias.
 */
@Injectable()
export class ImportRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Guarda los datos parseados de forma atomica.
   * @param userId - Dueno de los datos.
   * @param parsed - Movimientos y transferencias normalizados.
   * @returns Resumen con los conteos de lo importado y creado.
   */
  async persist(userId: string, parsed: ParsedImport): Promise<ImportResult> {
    return this.db.transaction(async (tx) => {
      const accountCache = new Map<string, string>();
      const categoryCache = new Map<string, string>();
      const created = { accounts: 0, categories: 0 };

      const getAccountId = async (name: string): Promise<string> => {
        const key = name.toLowerCase();
        const cached = accountCache.get(key);
        if (cached) return cached;
        const id = await this.resolveAccount(tx, userId, name, created);
        accountCache.set(key, id);
        return id;
      };

      const getCategoryId = async (name: string, type: 'income' | 'expense'): Promise<string> => {
        const key = `${type}:${name.toLowerCase()}`;
        const cached = categoryCache.get(key);
        if (cached) return cached;
        const id = await this.resolveCategory(tx, userId, name, type, created);
        categoryCache.set(key, id);
        return id;
      };

      for (const t of parsed.transactions) {
        const categoryId = await getCategoryId(t.categoryName, t.type);
        const accountId = t.accountName ? await getAccountId(t.accountName) : null;
        await tx.insert(transactions).values({
          userId,
          categoryId,
          accountId,
          amount: t.amount.toFixed(2),
          occurredOn: t.occurredOn,
          description: t.description,
        });
      }

      let transfersInserted = 0;
      for (const tr of parsed.transfers) {
        const fromAccountId = await getAccountId(tr.fromName);
        const toAccountId = await getAccountId(tr.toName);
        // Las transferencias a la misma cuenta no son validas; se omiten.
        if (fromAccountId === toAccountId) continue;
        await tx.insert(transfers).values({
          userId,
          fromAccountId,
          toAccountId,
          amount: tr.amount.toFixed(2),
          occurredOn: tr.occurredOn,
          description: tr.description,
        });
        transfersInserted++;
      }

      return {
        transactions: parsed.transactions.length,
        transfers: transfersInserted,
        accountsCreated: created.accounts,
        categoriesCreated: created.categories,
        skipped: parsed.skipped,
      };
    });
  }

  /** Busca una cuenta viva por nombre o la crea; cuenta las creadas. */
  private async resolveAccount(
    tx: Tx,
    userId: string,
    name: string,
    created: { accounts: number },
  ): Promise<string> {
    const [existing] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          sql`lower(${accounts.name}) = ${name.toLowerCase()}`,
          isNull(accounts.deletedAt),
        ),
      )
      .limit(1);
    if (existing) return existing.id;
    const [account] = await tx
      .insert(accounts)
      .values({ userId, name, color: paletteColor(created.accounts) })
      .returning({ id: accounts.id });
    created.accounts++;
    return account.id;
  }

  /** Busca una categoria viva por nombre y tipo o la crea; cuenta las creadas. */
  private async resolveCategory(
    tx: Tx,
    userId: string,
    name: string,
    type: 'income' | 'expense',
    created: { categories: number },
  ): Promise<string> {
    const [existing] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.type, type),
          // La importacion trabaja con categorias de primer nivel (hojas sin hijos).
          isNull(categories.parentId),
          sql`lower(${categories.name}) = ${name.toLowerCase()}`,
          isNull(categories.deletedAt),
        ),
      )
      .limit(1);
    if (existing) return existing.id;
    const [category] = await tx
      .insert(categories)
      .values({ userId, name, type, color: paletteColor(created.categories) })
      .returning({ id: categories.id });
    created.categories++;
    return category.id;
  }
}
