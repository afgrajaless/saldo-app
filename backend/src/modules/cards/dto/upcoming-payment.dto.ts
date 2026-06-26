import { ApiProperty } from '@nestjs/swagger';

/** Proximo pago estimado de una tarjeta */
export class UpcomingPaymentDto {
  @ApiProperty({ description: 'UUID de la tarjeta.', example: 'uuid' })
  cardId!: string;

  @ApiProperty({ description: 'Nombre de la tarjeta.', example: 'Visa Platinum' })
  name!: string;

  @ApiProperty({ description: 'Fecha límite de pago del ciclo actual (YYYY-MM-DD).', example: '2026-07-25' })
  paymentDueDate!: string;

  @ApiProperty({ description: 'Pago mínimo estimado.', example: 30000 })
  estimatedMinPayment!: number;

  @ApiProperty({ description: 'Saldo estimado del ciclo actual.', example: 600000 })
  estimatedBalance!: number;
}
