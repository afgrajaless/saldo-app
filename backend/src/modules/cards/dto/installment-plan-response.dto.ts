import { ApiProperty } from '@nestjs/swagger';

/** Item de cuota de un plan diferido */
export class InstallmentItemDto {
  @ApiProperty({ description: 'Número secuencial de la cuota.', example: 1 })
  number!: number;

  @ApiProperty({ description: 'Fecha de vencimiento (YYYY-MM-DD).', example: '2026-07-15' })
  dueOn!: string;

  @ApiProperty({ description: 'Capital amortizado en la cuota.', example: 50000 })
  principal!: number;

  @ApiProperty({ description: 'Interés causado en la cuota.', example: 5000 })
  interest!: number;

  @ApiProperty({ description: 'Saldo pendiente tras la cuota.', example: 450000 })
  balance!: number;
}

/** Plan diferido con su cronograma */
export class InstallmentPlanResponseDto {
  @ApiProperty({ description: 'UUID del plan.', example: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'UUID de la tarjeta.', example: 'uuid' })
  accountId!: string;

  @ApiProperty({ description: 'Descripción de la compra.', example: 'Samsung TV 55"' })
  description!: string | null;

  @ApiProperty({ description: 'Capital total diferido.', example: 500000 })
  principal!: number;

  @ApiProperty({ description: 'Número de cuotas.', example: 10 })
  numberOfInstallments!: number;

  @ApiProperty({ description: 'Tasa M.V. del diferido (fracción decimal).', example: 0.018 })
  monthlyRate!: number;

  @ApiProperty({ description: 'Fecha de inicio del plan (YYYY-MM-DD).', example: '2026-01-15' })
  startDate!: string;

  @ApiProperty({ description: 'Estado del plan.', example: 'active' })
  status!: string;

  @ApiProperty({ description: 'Cronograma de cuotas.', type: [InstallmentItemDto] })
  items!: InstallmentItemDto[];
}
