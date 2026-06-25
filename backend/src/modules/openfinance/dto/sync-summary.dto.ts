import { ApiProperty } from '@nestjs/swagger';

/** Resumen del resultado de una sincronización de Open Finance. */
export class SyncSummaryDto {
  @ApiProperty({ description: 'Cuentas de activo creadas.', example: 2 })
  accountsCreated!: number;
  @ApiProperty({ description: 'Cuentas de activo actualizadas.', example: 0 })
  accountsUpdated!: number;
  @ApiProperty({ description: 'Tarjetas creadas.', example: 1 })
  cardsCreated!: number;
  @ApiProperty({ description: 'Tarjetas actualizadas.', example: 0 })
  cardsUpdated!: number;
  @ApiProperty({ description: 'Deudas creadas.', example: 1 })
  debtsCreated!: number;
  @ApiProperty({ description: 'Deudas actualizadas.', example: 0 })
  debtsUpdated!: number;
  @ApiProperty({ description: 'Productos omitidos por no ser mapeables.', example: 1 })
  skipped!: number;
}
