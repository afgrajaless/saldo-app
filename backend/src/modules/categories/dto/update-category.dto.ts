import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Campos editables de una categoria (el tipo no se cambia). */
export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Nombre de la categoria.', example: 'Vivienda' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ description: 'Color hex para la UI.', example: '#2D6FB0' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Meta mensual de gasto.', example: 1800000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyBudget?: number;
}
