import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de una invitacion en las respuestas de la API. */
export class InviteResponseDto {
  @ApiProperty({ description: 'UUID de la invitación.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'UUID del grupo al que pertenece la invitación.', format: 'uuid' })
  groupId!: string;

  @ApiProperty({
    description: 'Código de invitación de 8 caracteres para compartir.',
    example: 'ABCD2345',
  })
  code!: string;

  @ApiPropertyOptional({
    description:
      'UUID del miembro fantasma que puede reclamar esta invitación. ' +
      'Null si la invitación es abierta.',
    format: 'uuid',
    nullable: true,
  })
  memberId!: string | null;

  @ApiProperty({
    description: 'UUID del usuario que generó la invitación.',
    format: 'uuid',
  })
  createdBy!: string;

  @ApiProperty({
    description: 'Fecha y hora de expiración del código (TTL 7 días).',
    format: 'date-time',
  })
  expiresAt!: Date;

  @ApiProperty({ description: 'Fecha de creación de la invitación.', format: 'date-time' })
  createdAt!: Date;
}
