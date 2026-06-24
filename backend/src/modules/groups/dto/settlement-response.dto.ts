import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Respuesta de una liquidacion de deuda entre dos miembros del grupo. */
export class SettlementResponseDto {
  @ApiProperty({ description: 'UUID de la liquidacion.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'UUID del grupo al que pertenece la liquidacion.', format: 'uuid' })
  groupId!: string;

  @ApiProperty({ description: 'UUID del miembro que realizo el pago.', format: 'uuid' })
  fromMemberId!: string;

  @ApiProperty({ description: 'UUID del miembro que recibio el pago.', format: 'uuid' })
  toMemberId!: string;

  @ApiProperty({ description: 'Monto liquidado en pesos colombianos.', example: 50000 })
  amount!: number;

  @ApiProperty({ description: 'Fecha en que se realizo la liquidacion (YYYY-MM-DD).', example: '2026-06-24' })
  settledOn!: string;

  @ApiPropertyOptional({
    description: 'UUID de la transaccion personal de egreso del pagador, si se registro.', format: 'uuid',
  })
  fromTransactionId!: string | null;

  @ApiPropertyOptional({
    description: 'UUID de la transaccion personal de ingreso del receptor, si se registro.', format: 'uuid',
  })
  toTransactionId!: string | null;

  @ApiProperty({ description: 'UUID del usuario que registro la liquidacion.', format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty({ description: 'Fecha y hora de creacion del registro.' })
  createdAt!: Date;
}
