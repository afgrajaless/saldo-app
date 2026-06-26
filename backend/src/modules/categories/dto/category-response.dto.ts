import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de una categoria en las respuestas de la API. */
export class CategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Arriendo' })
  name!: string;

  @ApiProperty({ example: 'expense' })
  type!: string;

  @ApiPropertyOptional({
    description: 'UUID de la categoría padre; null si es de primer nivel.',
    format: 'uuid',
    nullable: true,
  })
  parentId!: string | null;

  @ApiProperty({ example: '#C0392B' })
  color!: string;

  @ApiPropertyOptional({ description: 'Meta mensual de gasto.', example: 1500000, nullable: true })
  monthlyBudget!: number | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    description: 'Cantidad de movimientos asociados a la categoría.',
    example: 3,
  })
  transactionCount!: number;

  @ApiProperty({
    description: 'Indica si la categoría tiene subcategorías vivas (es un padre).',
    example: false,
  })
  hasChildren!: boolean;
}
