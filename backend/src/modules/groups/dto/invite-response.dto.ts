import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de una invitacion en las respuestas de la API. */
export class InviteResponseDto {
  @ApiProperty({ description: 'UUID de la invitacion.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'UUID del grupo al que pertenece la invitacion.', format: 'uuid' })
  groupId!: string;

  @ApiProperty({
    description: 'Codigo de invitacion de 8 caracteres para compartir.',
    example: 'ABCD2345',
  })
  code!: string;

  @ApiPropertyOptional({
    description:
      'UUID del miembro fantasma que puede reclamar esta invitacion. ' +
      'Null si la invitacion es abierta.',
    format: 'uuid',
    nullable: true,
  })
  memberId!: string | null;

  @ApiProperty({
    description: 'UUID del usuario que genero la invitacion.',
    format: 'uuid',
  })
  createdBy!: string;

  @ApiProperty({
    description: 'Fecha y hora de expiracion del codigo (TTL 7 dias).',
    format: 'date-time',
  })
  expiresAt!: Date;

  @ApiProperty({ description: 'Fecha de creacion de la invitacion.', format: 'date-time' })
  createdAt!: Date;
}
