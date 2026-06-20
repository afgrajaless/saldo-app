/** Movimiento (ingreso/egreso) normalizado desde el archivo. */
export interface ParsedTransaction {
  type: 'income' | 'expense';
  categoryName: string;
  accountName: string | null;
  amount: number;
  occurredOn: string;
  description: string | null;
}

/** Transferencia entre cuentas normalizada desde el archivo. */
export interface ParsedTransfer {
  fromName: string;
  toName: string;
  amount: number;
  occurredOn: string;
  description: string | null;
}

/** Resultado del parseo del archivo, listo para persistir. */
export interface ParsedImport {
  transactions: ParsedTransaction[];
  transfers: ParsedTransfer[];
  skipped: {
    summary: number;
    transferCounterpart: number;
    sameAccountTransfer: number;
    invalid: number;
  };
}

/** Normaliza texto: minusculas, sin acentos, recortado. */
function normalize(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Busca el indice de una columna por su encabezado (sin acentos/mayusculas).
 * @param headers - Fila de encabezados ya normalizados.
 * @param candidates - Nombres posibles del encabezado.
 * @returns El indice de la columna, o -1 si no se encuentra.
 */
function findColumn(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) => candidates.includes(h));
}

/** Convierte el valor de monto (numero o texto con separadores) a numero. */
function parseAmount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  let s = value.trim().replace(/\s/g, '');
  if (/,\d{1,2}$/.test(s)) {
    // Coma decimal con puntos de miles: 1.234.567,89
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // Solo puntos de miles, sin decimal: 2.400.000
    s = s.replace(/\./g, '');
  } else {
    // Comas de miles o punto decimal estandar: 199609.83
    s = s.replace(/,/g, '');
  }
  return Number(s);
}

/** Convierte el valor de fecha (Date o texto) a 'YYYY-MM-DD'; '' si invalida. */
function parseDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parseDate(parsed);
  }
  return '';
}

/** Construye la descripcion combinando subcategoria, nota y descripcion. */
function buildDescription(parts: unknown[]): string | null {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const part of parts) {
    const text = String(part ?? '').trim();
    if (text && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      clean.push(text);
    }
  }
  if (clean.length === 0) return null;
  return clean.join(' · ').slice(0, 200);
}

/**
 * Mapea las filas crudas de un export de app de finanzas a movimientos y
 * transferencias normalizados. La primera fila es el encabezado.
 *
 * Reglas: "Gastos"->egreso, "Ingreso"->ingreso; "Dinero gastado"->transferencia
 * (pata canonica: de la cuenta a la categoria-cuenta destino); "Dinero
 * ingresado" se omite (es la contraparte); filas "Saldo de..." son resumenes.
 *
 * @param rows - Filas del archivo (arreglo de arreglos), incluyendo encabezado.
 * @returns Estructura normalizada lista para persistir.
 */
export function mapRows(rows: unknown[][]): ParsedImport {
  const result: ParsedImport = {
    transactions: [],
    transfers: [],
    skipped: { summary: 0, transferCounterpart: 0, sameAccountTransfer: 0, invalid: 0 },
  };
  if (rows.length < 2) return result;

  const headers = rows[0].map(normalize);
  const dateIdx = Math.max(0, findColumn(headers, ['segun un periodo', 'fecha', 'periodo']));
  const accountIdx = findColumn(headers, ['cuentas', 'cuenta']);
  const categoryIdx = findColumn(headers, ['categoria']);
  const subIdx = findColumn(headers, ['subcategorias', 'subcategoria']);
  const noteIdx = findColumn(headers, ['nota']);
  const typeIdx = findColumn(headers, ['ingreso/gasto', 'tipo']);
  const descIdx = findColumn(headers, ['descripcion']);
  const amountIdx = findColumn(headers, ['importe', 'monto']);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const type = normalize(row[typeIdx]);
    const amount = parseAmount(row[amountIdx]);
    const occurredOn = parseDate(row[dateIdx]);
    const account = String(row[accountIdx] ?? '').trim();
    const category = String(row[categoryIdx] ?? '').trim();
    const description = buildDescription([
      subIdx >= 0 ? row[subIdx] : null,
      noteIdx >= 0 ? row[noteIdx] : null,
      descIdx >= 0 ? row[descIdx] : null,
    ]);

    if (type.startsWith('saldo')) {
      result.skipped.summary++;
      continue;
    }
    if (type === 'dinero ingresado') {
      // Contraparte de la transferencia; se procesa via la pata "Dinero gastado".
      result.skipped.transferCounterpart++;
      continue;
    }
    if (type === 'dinero gastado') {
      if (!account || !category || !occurredOn || !(amount > 0)) {
        result.skipped.invalid++;
        continue;
      }
      // Transferencia a la misma cuenta (quirk del export); no es valida.
      if (account.toLowerCase() === category.toLowerCase()) {
        result.skipped.sameAccountTransfer++;
        continue;
      }
      result.transfers.push({
        fromName: account,
        toName: category,
        amount,
        occurredOn,
        description,
      });
      continue;
    }
    const txType = type === 'ingreso' ? 'income' : type === 'gastos' ? 'expense' : null;
    if (txType === null || !category || !occurredOn || !(amount > 0)) {
      result.skipped.invalid++;
      continue;
    }
    result.transactions.push({
      type: txType,
      categoryName: category,
      accountName: account || null,
      amount,
      occurredOn,
      description,
    });
  }

  return result;
}
