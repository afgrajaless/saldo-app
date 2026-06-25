import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Respuesta de una tarjeta de credito con sus parametros de configuracion. */
export class CardResponseDto {
  @ApiProperty({ description: 'UUID de la cuenta/tarjeta.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Nombre de la tarjeta.', example: 'Visa Platinum' })
  name!: string;

  @ApiProperty({ description: 'Color hex para la UI.', example: '#1A1A2E' })
  color!: string;

  @ApiProperty({ description: 'Cupo total autorizado en pesos.', example: 5000000 })
  creditLimit!: number;

  @ApiProperty({ description: 'Dia de cierre del periodo de facturacion (1-31).', example: 15 })
  statementDay!: number;

  @ApiProperty({ description: 'Dia de vencimiento del pago (1-31).', example: 25 })
  paymentDay!: number;

  @ApiProperty({
    description: 'Tasa de interes corriente E.A. del diferido rotativo (fraccion decimal).',
    example: 0.28,
  })
  rotativoRateEa!: number;

  @ApiProperty({
    description: 'Pago minimo como fraccion decimal del saldo (ej. 0.05 = 5%).',
    example: 0.05,
  })
  minPaymentPct!: number;

  @ApiPropertyOptional({
    description: 'Cuota de manejo en pesos; null si no cobra.',
    example: 12500,
    nullable: true,
  })
  managementFee!: number | null;

  @ApiProperty({
    description: 'Periodicidad de la cuota de manejo.',
    enum: ['none', 'monthly', 'annual'],
    example: 'monthly',
  })
  managementFeePeriod!: 'none' | 'monthly' | 'annual';

  @ApiProperty({ description: 'Fecha de creacion de la tarjeta.' })
  createdAt!: Date;
}
