import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Periodicidades validas para la cuota de manejo. */
const FEE_PERIODS = ['none', 'monthly', 'annual'] as const;

/** Datos para crear una tarjeta de credito. */
export class CreateCardDto {
  @ApiProperty({ description: 'Nombre de la tarjeta.', example: 'Visa Platinum' })
  @IsString()
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({ description: 'Color hex para la UI.', example: '#1A1A2E' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiProperty({ description: 'Cupo total autorizado en pesos.', example: 5000000 })
  @IsNumber()
  @Min(0.01)
  creditLimit!: number;

  @ApiProperty({ description: 'Dia del mes en que cierra el periodo de facturacion (1-31).', example: 15 })
  @IsInt()
  @Min(1)
  @Max(31)
  statementDay!: number;

  @ApiProperty({ description: 'Dia del mes en que vence el pago (1-31).', example: 25 })
  @IsInt()
  @Min(1)
  @Max(31)
  paymentDay!: number;

  @ApiProperty({
    description: 'Tasa de interes corriente E.A. del diferido rotativo (fraccion decimal, ej. 0.28 = 28%).',
    example: 0.28,
  })
  @IsNumber()
  @Min(0)
  rotativoRateEa!: number;

  @ApiPropertyOptional({
    description: 'Pago minimo como fraccion decimal del saldo (ej. 0.05 = 5%). Por defecto 0.05.',
    example: 0.05,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minPaymentPct?: number;

  @ApiPropertyOptional({ description: 'Cuota de manejo en pesos; null si no aplica.', example: 12500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  managementFee?: number;

  @ApiPropertyOptional({
    description: 'Periodicidad de la cuota de manejo.',
    enum: FEE_PERIODS,
    example: 'monthly',
  })
  @IsOptional()
  @IsIn(FEE_PERIODS)
  managementFeePeriod?: 'none' | 'monthly' | 'annual';
}
