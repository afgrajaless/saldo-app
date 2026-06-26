import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de una deuda en las respuestas de la API. */
export class DebtResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Bancolombia' })
  creditor!: string;

  @ApiProperty({ example: 'libre_inversion' })
  debtType!: string;

  @ApiProperty({ description: 'Capital del crédito.', example: 10000000 })
  principalAmount!: number;

  @ApiProperty({ description: 'Tasa ingresada por el usuario (fracción decimal).', example: 0.0179 })
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

  @ApiProperty({ description: 'Modalidad del seguro: none, rate o fixed.', example: 'fixed' })
  insuranceMode!: string;

  @ApiPropertyOptional({
    description: 'Valor del seguro (tasa si rate, monto si fixed).',
    example: 1811,
    nullable: true,
  })
  insuranceValue!: number | null;

  @ApiProperty({ description: 'Modo de causación del interés: monthly o daily.', example: 'monthly' })
  interestMode!: string;

  @ApiProperty({ example: 'activa' })
  status!: string;

  @ApiProperty({
    description: 'Origen del registro: manual u open_finance.',
    enum: ['manual', 'open_finance'],
    example: 'manual',
  })
  source!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    description: 'Saldo de capital pendiente hoy (suma del capital de las cuotas no pagadas).',
    example: 3722439.78,
  })
  currentBalance!: number;

  @ApiProperty({
    description: 'Valor de la próxima cuota pendiente (capital + interés + seguro). 0 si está pagada.',
    example: 199609.83,
  })
  monthlyPayment!: number;

  @ApiProperty({
    description: 'Interés que genera la próxima cuota pendiente (lo que cuesta la deuda este mes).',
    example: 65669.02,
  })
  monthlyInterestCost!: number;

  @ApiProperty({ description: 'Cantidad de cuotas ya pagadas.', example: 16 })
  paidInstallments!: number;

  @ApiProperty({ description: 'Cantidad de cuotas pendientes.', example: 20 })
  remainingInstallments!: number;
}

/** Una cuota del cronograma en las respuestas de la API. */
export class InstallmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1 })
  number!: number;

  @ApiProperty({ example: '2026-02-15' })
  dueDate!: string;

  @ApiProperty({ description: 'Abono a capital de la cuota.', example: 250000 })
  principalPortion!: number;

  @ApiProperty({ description: 'Interés de la cuota.', example: 150000 })
  interestPortion!: number;

  @ApiProperty({ description: 'Seguro de la cuota (0 si no aplica).', example: 1811 })
  insurancePortion!: number;

  @ApiProperty({ description: 'Valor total de la cuota (capital + interés + seguro).', example: 401811 })
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

  @ApiProperty({ description: 'Total de intereses del crédito.', example: 4400000 })
  totalInterest!: number;

  @ApiProperty({ description: 'Total de seguro del crédito.', example: 65196 })
  totalInsurance!: number;

  @ApiProperty({ description: 'Total a pagar (capital + intereses + seguro).', example: 14465196 })
  totalPaid!: number;
}
