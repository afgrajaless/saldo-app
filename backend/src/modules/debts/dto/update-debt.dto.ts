import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { debtStatusEnum } from '../../../db/schema';

/** Campos editables de una deuda. Solo se permite actualizar acreedor y estado. */
export class UpdateDebtDto {
  @ApiPropertyOptional({ description: 'Nombre del acreedor.', example: 'Davivienda' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  creditor?: string;

  @ApiPropertyOptional({
    description: 'Estado de la deuda.',
    enum: debtStatusEnum.enumValues,
    example: 'pagada',
  })
  @IsOptional()
  @IsIn(debtStatusEnum.enumValues)
  status?: (typeof debtStatusEnum.enumValues)[number];
}
