import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { cdtInterestPaymentEnum, yieldTypeEnum } from '../../../db/schema';

/** Configura el rendimiento de una cuenta (remunerada o CDT). */
export class SetYieldDto {
  @ApiProperty({
    description: 'Tipo de rendimiento: none, savings (remunerada) o cdt.',
    enum: yieldTypeEnum.enumValues,
    example: 'savings',
  })
  @IsIn(yieldTypeEnum.enumValues)
  yieldType!: (typeof yieldTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    description: 'Tasa E.A. como fracción decimal (0.1125 = 11.25%). Requerida si savings o cdt.',
    example: 0.1125,
  })
  @ValidateIf((dto: SetYieldDto) => dto.yieldType !== 'none')
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(1)
  effectiveAnnualRate?: number;

  @ApiPropertyOptional({
    description: 'Fecha desde la que aplica la tasa (YYYY-MM-DD). Por defecto, hoy.',
    example: '2026-06-01',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  rateValidFrom?: string;

  // ---- Campos exclusivos de CDT ----

  @ApiPropertyOptional({ description: 'Capital del CDT. Requerido si cdt.', example: 5000000 })
  @ValidateIf((dto: SetYieldDto) => dto.yieldType === 'cdt')
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El capital debe ser mayor que cero.' })
  principal?: number;

  @ApiPropertyOptional({ description: 'Fecha de apertura del CDT (YYYY-MM-DD).', example: '2026-06-01' })
  @ValidateIf((dto: SetYieldDto) => dto.yieldType === 'cdt')
  @IsISO8601({ strict: true })
  openedOn?: string;

  @ApiPropertyOptional({ description: 'Plazo del CDT en días.', example: 180 })
  @ValidateIf((dto: SetYieldDto) => dto.yieldType === 'cdt')
  @IsInt()
  @Min(1)
  @Max(3650)
  termDays?: number;

  @ApiPropertyOptional({
    description: 'Retención en la fuente sobre intereses (fracción). Por defecto 0.04.',
    example: 0.04,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  withholdingRate?: number;

  @ApiPropertyOptional({
    description: 'Forma de pago del interés del CDT.',
    enum: cdtInterestPaymentEnum.enumValues,
    default: 'at_maturity',
  })
  @IsOptional()
  @IsIn(cdtInterestPaymentEnum.enumValues)
  interestPayment?: (typeof cdtInterestPaymentEnum.enumValues)[number];
}
