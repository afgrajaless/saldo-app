import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de una cuenta en las respuestas de la API. */
export class AccountResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Nequi' })
  name!: string;

  @ApiProperty({ example: '#2D6FB0' })
  color!: string;

  @ApiProperty({
    description: 'Tipo de cuenta: asset para cuentas de activo (ahorros, corriente, CDT) o credit_card para tarjetas de crédito.',
    enum: ['asset', 'credit_card'],
    example: 'asset',
  })
  kind!: string;

  @ApiProperty({
    description: 'Origen del registro: manual u open_finance.',
    enum: ['manual', 'open_finance'],
    example: 'manual',
  })
  source!: string;

  @ApiProperty({ description: 'Tipo de rendimiento: none, savings o cdt.', example: 'savings' })
  yieldType!: string;

  @ApiPropertyOptional({
    description: 'Tasa E.A. vigente (fracción decimal); null si no genera rendimiento.',
    example: 0.1125,
    nullable: true,
  })
  effectiveAnnualRate!: number | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
