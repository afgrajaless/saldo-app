import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

/** DTO para reconciliar el extracto de tarjeta con los valores reales del banco. */
export class ReconcileStatementDto {
  @ApiProperty({ description: 'Fecha de corte del extracto (YYYY-MM-DD).', example: '2025-07-15' })
  @IsDateString()
  cutoffDate!: string;

  @ApiProperty({ description: 'Saldo real del extracto en pesos.', example: 465000 })
  @IsNumber()
  @Min(0)
  reconciledBalance!: number;

  @ApiProperty({ description: 'Pago mínimo real del extracto en pesos.', example: 23250 })
  @IsNumber()
  @Min(0)
  reconciledMinPayment!: number;

  @ApiPropertyOptional({ description: 'Pago total realizado; omitir si no se ha pagado aún.', example: 465000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reconciledTotalPayment?: number;
}
