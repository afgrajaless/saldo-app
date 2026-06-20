import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de una categoria en las respuestas de la API. */
export class CategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Arriendo' })
  name!: string;

  @ApiProperty({ example: 'expense' })
  type!: string;

  @ApiProperty({ example: '#C0392B' })
  color!: string;

  @ApiPropertyOptional({ description: 'Meta mensual de gasto.', example: 1500000, nullable: true })
  monthlyBudget!: number | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    description: 'Cantidad de movimientos asociados a la categoria.',
    example: 3,
  })
  transactionCount!: number;
}
