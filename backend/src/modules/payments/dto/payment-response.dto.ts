import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de un pago en las respuestas de la API. */
export class PaymentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  debtId!: string;

  @ApiPropertyOptional({ description: 'Cuota asociada (null si es abono extraordinario).', format: 'uuid' })
  installmentId!: string | null;

  @ApiProperty({ example: 400000 })
  amount!: number;

  @ApiProperty({ example: '2026-03-15' })
  paymentDate!: string;

  @ApiProperty({ example: 'regular' })
  type!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

/** Resumen del efecto de un abono a capital sobre el credito. */
export class PrepaymentSummaryDto {
  @ApiProperty({ description: 'Abono efectivamente aplicado (acotado al saldo).', example: 2000000 })
  appliedExtraPayment!: number;

  @ApiProperty({ description: 'Saldo de capital tras el abono.', example: 8000000 })
  newBalance!: number;

  @ApiProperty({ description: 'Indica si el abono cancela la deuda.', example: false })
  isPaidOff!: boolean;

  @ApiProperty({ description: 'Intereses ahorrados frente a no abonar.', example: 850000 })
  interestSaved!: number;

  @ApiProperty({ description: 'Cuotas restantes tras el recalculo.', example: 18 })
  remainingInstallments!: number;
}

/** Resultado de registrar un pago: el pago y, si aplica, el resumen del abono. */
export class PaymentResultDto {
  @ApiProperty({ type: PaymentResponseDto })
  payment!: PaymentResponseDto;

  @ApiPropertyOptional({ type: PrepaymentSummaryDto })
  prepayment?: PrepaymentSummaryDto;
}
