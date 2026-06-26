import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  amortizationSystemEnum,
  debtTypeEnum,
  insuranceModeEnum,
  interestModeEnum,
  rateTypeEnum,
} from '../../../db/schema';

/** Datos para registrar una nueva obligacion (deuda). */
export class CreateDebtDto {
  @ApiProperty({ description: 'Nombre del acreedor.', example: 'Bancolombia' })
  @IsString()
  @MaxLength(120)
  creditor!: string;

  @ApiProperty({
    description: 'Tipo de obligación.',
    enum: debtTypeEnum.enumValues,
    example: 'libre_inversion',
  })
  @IsIn(debtTypeEnum.enumValues)
  debtType!: (typeof debtTypeEnum.enumValues)[number];

  @ApiProperty({ description: 'Capital del crédito (monto principal).', example: 10000000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El capital debe ser mayor que cero.' })
  principalAmount!: number;

  @ApiProperty({
    description: 'Tasa tal como la ingresa el usuario, como fracción decimal (0.24 = 24 %).',
    example: 0.0179,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  nominalRate!: number;

  @ApiProperty({
    description: 'Cómo se expresa la tasa: ea (efectiva anual), mv (mensual vencida), nominal_anual.',
    enum: rateTypeEnum.enumValues,
    example: 'mv',
  })
  @IsIn(rateTypeEnum.enumValues)
  rateType!: (typeof rateTypeEnum.enumValues)[number];

  @ApiProperty({
    description: 'Sistema de amortización.',
    enum: amortizationSystemEnum.enumValues,
    default: 'frances',
    required: false,
  })
  @IsOptional()
  @IsIn(amortizationSystemEnum.enumValues)
  amortizationSystem?: (typeof amortizationSystemEnum.enumValues)[number];

  @ApiProperty({ description: 'Plazo en meses (número de cuotas).', example: 36, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(600)
  termMonths!: number;

  @ApiProperty({ description: 'Fecha de inicio del crédito (YYYY-MM-DD).', example: '2026-01-15' })
  @IsISO8601({ strict: true })
  startDate!: string;

  @ApiPropertyOptional({
    description:
      'Modo de causación del interés: monthly (mensual contable) o daily (por días reales entre cuotas).',
    enum: interestModeEnum.enumValues,
    default: 'monthly',
  })
  @IsOptional()
  @IsIn(interestModeEnum.enumValues)
  interestMode?: (typeof interestModeEnum.enumValues)[number];

  @ApiPropertyOptional({
    description:
      'Modalidad del seguro de vida deudor: none (sin seguro), rate (tasa sobre el saldo) o fixed (monto fijo mensual).',
    enum: insuranceModeEnum.enumValues,
    default: 'none',
  })
  @IsOptional()
  @IsIn(insuranceModeEnum.enumValues)
  insuranceMode?: (typeof insuranceModeEnum.enumValues)[number];

  @ApiPropertyOptional({
    description:
      'Valor del seguro: si mode=rate es la tasa mensual (fracción); si mode=fixed es el monto fijo. Requerido si mode != none.',
    example: 1811,
  })
  @ValidateIf((dto: CreateDebtDto) => dto.insuranceMode === 'rate' || dto.insuranceMode === 'fixed')
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive({ message: 'El valor del seguro debe ser mayor que cero.' })
  insuranceValue?: number;
}

