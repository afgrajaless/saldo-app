import { ApiProperty } from '@nestjs/swagger';

/** Conteo de filas omitidas durante la importacion. */
export class ImportSkippedDto {
  @ApiProperty({ description: 'Filas de resumen (Saldo de...) omitidas.', example: 3 })
  summary!: number;

  @ApiProperty({ description: 'Contrapartes de transferencia omitidas.', example: 9 })
  transferCounterpart!: number;

  @ApiProperty({ description: 'Transferencias a la misma cuenta omitidas.', example: 1 })
  sameAccountTransfer!: number;

  @ApiProperty({ description: 'Filas invalidas (sin fecha, monto o categoria).', example: 0 })
  invalid!: number;
}

/** Resumen del resultado de una importacion. */
export class ImportResultDto {
  @ApiProperty({ description: 'Movimientos (ingresos/egresos) importados.', example: 116 })
  transactions!: number;

  @ApiProperty({ description: 'Transferencias entre cuentas importadas.', example: 9 })
  transfers!: number;

  @ApiProperty({ description: 'Cuentas nuevas creadas durante la importacion.', example: 5 })
  accountsCreated!: number;

  @ApiProperty({ description: 'Categorias nuevas creadas durante la importacion.', example: 12 })
  categoriesCreated!: number;

  @ApiProperty({ description: 'Detalle de filas omitidas.', type: ImportSkippedDto })
  skipped!: ImportSkippedDto;
}
