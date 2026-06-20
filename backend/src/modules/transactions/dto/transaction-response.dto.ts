import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de una transaccion en las respuestas de la API. */
export class TransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ example: 'Arriendo' })
  categoryName!: string;

  @ApiProperty({ example: 'expense' })
  categoryType!: string;

  @ApiProperty({ example: '#C0392B' })
  categoryColor!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Cuenta asociada.' })
  accountId!: string | null;

  @ApiPropertyOptional({ example: 'Nequi', nullable: true, description: 'Nombre de la cuenta.' })
  accountName!: string | null;

  @ApiProperty({ example: 1500000 })
  amount!: number;

  @ApiProperty({ example: '2026-06-05' })
  occurredOn!: string;

  @ApiPropertyOptional({ example: 'Pago arriendo junio', nullable: true })
  description!: string | null;
}
