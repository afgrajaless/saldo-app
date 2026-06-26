import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Parte de un gasto asignada a un miembro. */
export class ShareResponseDto {
  @ApiProperty({ description: 'UUID del registro de parte.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'UUID del miembro al que le corresponde esta parte.', format: 'uuid' })
  memberId!: string;

  @ApiProperty({ description: 'Monto asignado a este miembro.', example: 30000 })
  shareAmount!: number;

  @ApiProperty({ description: 'Estado de la parte: confirmed, pending o disputed.', enum: ['confirmed', 'pending', 'disputed'] })
  status!: string;

  @ApiPropertyOptional({ description: 'Nota que explica el motivo de la disputa. Solo presente cuando status es disputed.', example: 'El monto no corresponde a lo que pedí.' })
  disputedNote!: string | null;
}

/** Respuesta de un gasto compartido con su distribucion de partes. */
export class ExpenseResponseDto {
  @ApiProperty({ description: 'UUID del gasto compartido.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'UUID del grupo al que pertenece el gasto.', format: 'uuid' })
  groupId!: string;

  @ApiProperty({ description: 'UUID del miembro que pagó el gasto.', format: 'uuid' })
  paidByMemberId!: string;

  @ApiPropertyOptional({ description: 'Descripción del gasto.', example: 'Cena del viernes' })
  description!: string | null;

  @ApiProperty({ description: 'Monto total del gasto.', example: 90000 })
  amount!: number;

  @ApiProperty({ description: 'Fecha en que ocurrió el gasto (YYYY-MM-DD).', example: '2026-06-10' })
  occurredOn!: string;

  @ApiProperty({ description: 'Método con el que se dividió el gasto.', enum: ['equal', 'exact'] })
  splitMethod!: 'equal' | 'exact';

  @ApiProperty({ description: 'UUID del usuario que registró el gasto.', format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty({ description: 'Fecha y hora de creación del gasto.' })
  createdAt!: Date;

  @ApiProperty({ description: 'Partes del gasto asignadas a cada miembro.', type: [ShareResponseDto] })
  shares!: ShareResponseDto[];
}
