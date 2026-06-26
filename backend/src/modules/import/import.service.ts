import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { mapRows } from './import.mapper';
import { ImportRepository, ImportResult } from './import.repository';

/** Servicio de importacion de movimientos desde archivos XLSX/CSV. */
@Injectable()
export class ImportService {
  constructor(private readonly importRepository: ImportRepository) {}

  /**
   * Importa los movimientos de un archivo (XLSX o CSV) de app de finanzas.
   * @param userId - Dueno de los datos.
   * @param buffer - Contenido del archivo subido.
   * @returns Resumen de lo importado (movimientos, transferencias, creados, omitidos).
   * @throws BadRequestException si el archivo no se puede leer o esta vacio.
   */
  async importFile(userId: string, buffer: Buffer): Promise<ImportResult> {
    const rows = this.readRows(buffer);
    const parsed = mapRows(rows);
    if (parsed.transactions.length === 0 && parsed.transfers.length === 0) {
      throw new BadRequestException(
        'No se encontraron movimientos válidos en el archivo. Verifica el formato.',
      );
    }
    return this.importRepository.persist(userId, parsed);
  }

  /**
   * Lee la primera hoja del archivo como arreglo de filas (arreglo de celdas).
   * @param buffer - Contenido del archivo (XLSX o CSV).
   * @returns Las filas de la hoja, incluyendo el encabezado.
   * @throws BadRequestException si el archivo no es legible.
   */
  private readRows(buffer: Buffer): unknown[][] {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('No se pudo leer el archivo. Debe ser XLSX o CSV válido.');
    }
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('El archivo no tiene hojas.');
    }
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: true });
  }
}
