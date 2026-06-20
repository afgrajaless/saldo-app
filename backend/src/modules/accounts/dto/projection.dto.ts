import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Un punto de la curva de proyeccion de crecimiento. */
export class ProjectionPointDto {
  @ApiProperty({ description: 'Fecha del punto (YYYY-MM-DD).', example: '2026-12-20' })
  date!: string;

  @ApiProperty({ description: 'Valor proyectado de la cuenta.', example: 1112500 })
  value!: number;

  @ApiProperty({ description: 'Interes acumulado hasta esa fecha.', example: 112500 })
  accruedInterest!: number;
}

/** Estado de un CDT (solo cuando la cuenta es de tipo cdt). */
export class CdtStatusDto {
  @ApiProperty({ example: 5000000 })
  principal!: number;

  @ApiProperty({ example: '2026-12-01' })
  maturesOn!: string;

  @ApiProperty({ description: 'Dias que faltan para el vencimiento.', example: 164 })
  daysRemaining!: number;

  @ApiProperty({ description: 'Interes bruto al vencimiento.', example: 312000 })
  grossInterest!: number;

  @ApiProperty({ description: 'Retencion en la fuente.', example: 12480 })
  withholding!: number;

  @ApiProperty({ description: 'Interes neto al vencimiento.', example: 299520 })
  netInterest!: number;

  @ApiProperty({ description: 'Valor a recibir al vencimiento (capital + neto).', example: 5299520 })
  maturityValue!: number;
}

/** Proyeccion de crecimiento de una cuenta con rendimiento. */
export class AccountProjectionDto {
  @ApiProperty({ description: 'Tipo de rendimiento: savings o cdt.', example: 'savings' })
  yieldType!: string;

  @ApiProperty({ description: 'Tasa E.A. usada en la proyeccion.', example: 0.1125 })
  effectiveAnnualRate!: number;

  @ApiProperty({ description: 'Valor base desde el que se proyecta.', example: 1000000 })
  baseValue!: number;

  @ApiProperty({ description: 'Curva de crecimiento.', type: [ProjectionPointDto] })
  points!: ProjectionPointDto[];

  @ApiPropertyOptional({ description: 'Estado del CDT (solo si yieldType=cdt).', type: CdtStatusDto })
  cdt?: CdtStatusDto;
}

/** Un punto de la serie de patrimonio (suma de saldos por fecha). */
export class NetWorthPointDto {
  @ApiProperty({ example: '2026-06-20' })
  date!: string;

  @ApiProperty({ description: 'Patrimonio total en la fecha.', example: 8500000 })
  total!: number;
}
