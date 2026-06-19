import { ApiProperty } from '@nestjs/swagger';
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
} from 'class-validator';
import {
  amortizationSystemEnum,
  debtTypeEnum,
  rateTypeEnum,
} from '../../../db/schema';

/** Datos para registrar una nueva obligacion (deuda). */
export class CreateDebtDto {
  @ApiProperty({ description: 'Nombre del acreedor.', example: 'Bancolombia' })
  @IsString()
  @MaxLength(120)
  creditor!: string;

  @ApiProperty({
    description: 'Tipo de obligacion.',
    enum: debtTypeEnum.enumValues,
    example: 'libre_inversion',
  })
  @IsIn(debtTypeEnum.enumValues)
  debtType!: (typeof debtTypeEnum.enumValues)[number];

  @ApiProperty({ description: 'Capital del credito (monto principal).', example: 10000000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El capital debe ser mayor que cero.' })
  principalAmount!: number;

  @ApiProperty({
    description: 'Tasa tal como la ingresa el usuario, como fraccion decimal (0.24 = 24 %).',
    example: 0.0179,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  nominalRate!: number;

  @ApiProperty({
    description: 'Como se expresa la tasa: ea (efectiva anual), mv (mensual vencida), nominal_anual.',
    enum: rateTypeEnum.enumValues,
    example: 'mv',
  })
  @IsIn(rateTypeEnum.enumValues)
  rateType!: (typeof rateTypeEnum.enumValues)[number];

  @ApiProperty({
    description: 'Sistema de amortizacion.',
    enum: amortizationSystemEnum.enumValues,
    default: 'frances',
    required: false,
  })
  @IsOptional()
  @IsIn(amortizationSystemEnum.enumValues)
  amortizationSystem?: (typeof amortizationSystemEnum.enumValues)[number];

  @ApiProperty({ description: 'Plazo en meses (numero de cuotas).', example: 36, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(600)
  termMonths!: number;

  @ApiProperty({ description: 'Fecha de inicio del credito (YYYY-MM-DD).', example: '2026-01-15' })
  @IsISO8601({ strict: true })
  startDate!: string;
}
