import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de un miembro de grupo en las respuestas de la API. */
export class MemberResponseDto {
  @ApiProperty({ description: 'UUID del miembro.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'UUID del grupo al que pertenece.', format: 'uuid' })
  groupId!: string;

  @ApiPropertyOptional({
    description: 'UUID del usuario real; null si es miembro fantasma.',
    format: 'uuid',
    nullable: true,
  })
  userId!: string | null;

  @ApiProperty({
    description: 'Nombre visible del miembro dentro del grupo.',
    example: 'Juan',
  })
  displayName!: string;

  @ApiProperty({
    description: 'Indica si el miembro es fantasma (no tiene cuenta en la app).',
    example: true,
  })
  isGhost!: boolean;

  @ApiProperty({ description: 'Fecha en que se agrego al miembro.', format: 'date-time' })
  joinedAt!: Date;
}
