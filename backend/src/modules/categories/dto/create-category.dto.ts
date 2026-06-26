import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { categoryTypeEnum } from '../../../db/schema';

/** Datos para crear una categoria de presupuesto. */
export class CreateCategoryDto {
  @ApiProperty({ description: 'Nombre de la categoría.', example: 'Arriendo' })
  @IsString()
  @MaxLength(60)
  name!: string;

  @ApiProperty({
    description: 'Tipo de categoría: income (ingreso) o expense (egreso).',
    enum: categoryTypeEnum.enumValues,
    example: 'expense',
  })
  @IsIn(categoryTypeEnum.enumValues)
  type!: (typeof categoryTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    description: 'Color hex para la UI.',
    example: '#C0392B',
  })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({
    description: 'Meta mensual de gasto (solo egresos).',
    example: 1500000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyBudget?: number;

  @ApiPropertyOptional({
    description:
      'UUID de la categoría padre. Si se envía, la categoría se crea como ' +
      'subcategoría (debe ser del mismo tipo). Omitir para una categoría de primer nivel.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
