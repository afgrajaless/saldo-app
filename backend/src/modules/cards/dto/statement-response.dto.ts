import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO de respuesta del extracto estimado/reconciliado de una tarjeta de credito. */
export class StatementResponseDto {
  @ApiProperty({ description: 'Fecha de corte del ciclo.', example: '2025-07-15' })
  cutoffDate!: string;

  @ApiProperty({ description: 'Fecha límite de pago.', example: '2025-07-25' })
  paymentDueDate!: string;

  @ApiProperty({ description: 'Saldo estimado del ciclo en pesos.', example: 450000 })
  estimatedBalance!: number;

  @ApiProperty({ description: 'Pago mínimo estimado en pesos.', example: 22500 })
  estimatedMinPayment!: number;

  @ApiPropertyOptional({ description: 'Saldo real según el extracto del banco.', nullable: true })
  reconciledBalance!: number | null;

  @ApiPropertyOptional({ description: 'Pago mínimo real según el extracto.', nullable: true })
  reconciledMinPayment!: number | null;

  @ApiPropertyOptional({ description: 'Pago total realizado; null hasta que se registra.', nullable: true })
  reconciledTotalPayment!: number | null;

  @ApiProperty({ description: 'Estado del extracto.', enum: ['open', 'closed', 'paid'] })
  status!: 'open' | 'closed' | 'paid';
}
