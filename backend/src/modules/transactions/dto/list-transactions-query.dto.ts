import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

/** Filtro de listado de transacciones por mes. */
export class ListTransactionsQueryDto {
  @ApiPropertyOptional({
    description: 'Mes a consultar en formato YYYY-MM. Por defecto, el mes actual.',
    example: '2026-06',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'El mes debe tener formato YYYY-MM.' })
  month?: string;
}
