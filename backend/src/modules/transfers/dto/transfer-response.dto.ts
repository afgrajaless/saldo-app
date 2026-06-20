import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de una transferencia en las respuestas de la API. */
export class TransferResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  fromAccountId!: string;

  @ApiProperty({ format: 'uuid' })
  toAccountId!: string;

  @ApiProperty({ example: 'Nequi' })
  fromAccountName!: string;

  @ApiProperty({ example: 'Dinero en efectivo' })
  toAccountName!: string;

  @ApiProperty({ example: 200000 })
  amount!: number;

  @ApiProperty({ example: '2026-06-10' })
  occurredOn!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Paso a efectivo' })
  description!: string | null;
}
