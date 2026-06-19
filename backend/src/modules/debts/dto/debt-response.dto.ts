import { ApiProperty } from '@nestjs/swagger';

/** Representacion de una deuda en las respuestas de la API. */
export class DebtResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Bancolombia' })
  creditor!: string;

  @ApiProperty({ example: 'libre_inversion' })
  debtType!: string;

  @ApiProperty({ description: 'Capital del credito.', example: 10000000 })
  principalAmount!: number;

  @ApiProperty({ description: 'Tasa ingresada por el usuario (fraccion decimal).', example: 0.0179 })
  nominalRate!: number;

  @ApiProperty({ example: 'mv' })
  rateType!: string;

  @ApiProperty({ description: 'Tasa normalizada a Efectiva Anual.', example: 0.237149 })
  effectiveAnnualRate!: number;

  @ApiProperty({ example: 'frances' })
  amortizationSystem!: string;

  @ApiProperty({ example: 36 })
  termMonths!: number;

  @ApiProperty({ example: '2026-01-15' })
  startDate!: string;

  @ApiProperty({ example: 'activa' })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

/** Una cuota del cronograma en las respuestas de la API. */
export class InstallmentResponseDto {
  @ApiProperty({ example: 1 })
  number!: number;

  @ApiProperty({ example: '2026-02-15' })
  dueDate!: string;

  @ApiProperty({ description: 'Abono a capital de la cuota.', example: 250000 })
  principalPortion!: number;

  @ApiProperty({ description: 'Interes de la cuota.', example: 150000 })
  interestPortion!: number;

  @ApiProperty({ description: 'Valor total de la cuota.', example: 400000 })
  totalAmount!: number;

  @ApiProperty({ description: 'Saldo de capital tras la cuota.', example: 9750000 })
  remainingBalance!: number;

  @ApiProperty({ example: 'pendiente' })
  status!: string;
}

/** Detalle de una deuda con su cronograma y totales. */
export class DebtDetailDto extends DebtResponseDto {
  @ApiProperty({ type: [InstallmentResponseDto] })
  installments!: InstallmentResponseDto[];

  @ApiProperty({ description: 'Total de intereses del credito.', example: 4400000 })
  totalInterest!: number;

  @ApiProperty({ description: 'Total a pagar (capital + intereses).', example: 14400000 })
  totalPaid!: number;
}
