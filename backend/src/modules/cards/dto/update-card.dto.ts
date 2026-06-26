import { ApiPropertyOptional } from '@nestjs/swagger';
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

/** Campos actualizables de una tarjeta de credito. */
export class UpdateCardDto {
  @ApiPropertyOptional({ description: 'Nombre de la tarjeta.', example: 'Mastercard Gold' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ description: 'Color hex para la UI.', example: '#B8860B' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Cupo total autorizado en pesos.', example: 8000000 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Día de cierre del período de facturación (1-31).', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  statementDay?: number;

  @ApiPropertyOptional({ description: 'Día de vencimiento del pago (1-31).', example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  paymentDay?: number;

  @ApiPropertyOptional({
    description: 'Tasa de interés corriente E.A. (fracción decimal).',
    example: 0.25,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rotativoRateEa?: number;

  @ApiPropertyOptional({
    description: 'Pago mínimo como fracción decimal del saldo (0-1).',
    example: 0.1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minPaymentPct?: number;

  @ApiPropertyOptional({ description: 'Cuota de manejo en pesos.', example: 15000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  managementFee?: number;

  @ApiPropertyOptional({
    description: 'Periodicidad de la cuota de manejo.',
    enum: ['none', 'monthly', 'annual'],
    example: 'monthly',
  })
  @IsOptional()
  @IsIn(['none', 'monthly', 'annual'])
  managementFeePeriod?: 'none' | 'monthly' | 'annual';
}
