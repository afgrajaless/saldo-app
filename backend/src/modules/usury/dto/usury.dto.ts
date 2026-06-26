import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsNumber, IsOptional, Min } from 'class-validator';
import { debtTypeEnum, rateTypeEnum, usuryModalityEnum } from '../../../db/schema';

/** Consulta de la tasa de usura vigente. */
export class CurrentUsuryQueryDto {
  @ApiProperty({
    description: 'Modalidad de usura a consultar.',
    enum: usuryModalityEnum.enumValues,
    example: 'consumo_ordinario',
  })
  @IsIn(usuryModalityEnum.enumValues)
  modality!: (typeof usuryModalityEnum.enumValues)[number];

  @ApiPropertyOptional({
    description: 'Fecha a evaluar (YYYY-MM-DD). Por defecto, hoy.',
    example: '2026-06-19',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  date?: string;
}

/** Lista del catalogo filtrada por modalidad (opcional). */
export class ListUsuryQueryDto {
  @ApiPropertyOptional({
    description: 'Modalidad a filtrar.',
    enum: usuryModalityEnum.enumValues,
  })
  @IsOptional()
  @IsIn(usuryModalityEnum.enumValues)
  modality?: (typeof usuryModalityEnum.enumValues)[number];
}

/** Evaluacion de una tasa hipotetica contra el tope de usura (antes de crear la deuda). */
export class EvaluateRateDto {
  @ApiProperty({ description: 'Tasa del crédito como fracción decimal (0.24 = 24 %).', example: 0.24 })
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiProperty({
    description: 'Representación de la tasa ingresada.',
    enum: rateTypeEnum.enumValues,
    example: 'ea',
  })
  @IsIn(rateTypeEnum.enumValues)
  rateType!: (typeof rateTypeEnum.enumValues)[number];

  @ApiProperty({
    description: 'Tipo de obligación (define la modalidad de usura).',
    enum: debtTypeEnum.enumValues,
    example: 'libre_inversion',
  })
  @IsIn(debtTypeEnum.enumValues)
  debtType!: (typeof debtTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    description: 'Fecha de referencia (YYYY-MM-DD). Por defecto, hoy.',
    example: '2026-06-26',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  date?: string;
}

/** Una tasa del catalogo de usura. */
export class UsuryRateDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'consumo_ordinario' })
  modality!: string;

  @ApiProperty({ description: 'Tope de usura en Efectiva Anual.', example: 0.2674 })
  effectiveAnnualRate!: number;

  @ApiProperty({ example: '2026-01-01' })
  validFrom!: string;

  @ApiProperty({ example: '2026-03-31' })
  validTo!: string;
}

/** Resultado de evaluar la tasa de una deuda contra el tope de usura. */
export class UsuryEvaluationDto {
  @ApiProperty({ description: 'Tasa de la deuda en E.A.', example: 0.1956 })
  effectiveAnnualRate!: number;

  @ApiProperty({ description: 'Tope de usura vigente en E.A.', example: 0.2674 })
  usuryCap!: number;

  @ApiProperty({ description: 'true si la tasa supera el tope (usura).', example: false })
  isUsurious!: boolean;

  @ApiProperty({ description: 'Margen en puntos: tope - tasa.', example: 0.0718 })
  marginPoints!: number;

  @ApiProperty({ description: 'Porcentaje del tope consumido por la tasa.', example: 73.15 })
  usagePercentage!: number;

  @ApiProperty({ description: 'Modalidad con la que se comparó.', example: 'consumo_ordinario' })
  modality!: string;

  @ApiProperty({ description: 'Fecha de referencia usada (inicio de la deuda).', example: '2026-01-15' })
  referenceDate!: string;
}
