import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/** Campos editables de una categoria (el tipo no se cambia). */
export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Nombre de la categoría.', example: 'Vivienda' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ description: 'Color hex para la UI.', example: '#2D6FB0' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({
    description: 'Meta mensual de gasto. Enviar null para quitar la meta.',
    example: 1800000,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyBudget?: number | null;

  @ApiPropertyOptional({
    description:
      'UUID de la categoría padre. Enviar null para volverla de primer nivel; ' +
      'un UUID para moverla bajo otra categoría del mismo tipo.',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  parentId?: string | null;
}
