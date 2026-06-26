import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Respuesta de una liquidacion de deuda entre dos miembros del grupo. */
export class SettlementResponseDto {
  @ApiProperty({ description: 'UUID de la liquidación.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'UUID del grupo al que pertenece la liquidación.', format: 'uuid' })
  groupId!: string;

  @ApiProperty({ description: 'UUID del miembro que realizó el pago.', format: 'uuid' })
  fromMemberId!: string;

  @ApiProperty({ description: 'UUID del miembro que recibió el pago.', format: 'uuid' })
  toMemberId!: string;

  @ApiProperty({ description: 'Monto liquidado en pesos colombianos.', example: 50000 })
  amount!: number;

  @ApiProperty({ description: 'Fecha en que se realizó la liquidación (YYYY-MM-DD).', example: '2026-06-24' })
  settledOn!: string;

  @ApiPropertyOptional({
    description: 'UUID de la transacción personal de egreso del pagador, si se registró.', format: 'uuid',
  })
  fromTransactionId!: string | null;

  @ApiPropertyOptional({
    description: 'UUID de la transacción personal de ingreso del receptor, si se registró.', format: 'uuid',
  })
  toTransactionId!: string | null;

  @ApiProperty({ description: 'UUID del usuario que registró la liquidación.', format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty({ description: 'Fecha y hora de creación del registro.' })
  createdAt!: Date;
}
