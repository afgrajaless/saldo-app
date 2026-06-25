import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsIn,
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

  @ApiPropertyOptional({ description: 'Dia de cierre del periodo de facturacion (1-31).', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  statementDay?: number;

  @ApiPropertyOptional({ description: 'Dia de vencimiento del pago (1-31).', example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  paymentDay?: number;

  @ApiPropertyOptional({
    description: 'Tasa de interes corriente E.A. (fraccion decimal).',
    example: 0.25,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rotativoRateEa?: number;

  @ApiPropertyOptional({
    description: 'Pago minimo como fraccion decimal del saldo (0-1).',
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
