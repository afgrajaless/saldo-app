import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de un grupo en las respuestas de la API. */
export class GroupResponseDto {
  @ApiProperty({ description: 'UUID del grupo.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Nombre del grupo.', example: 'Apartamento 301' })
  name!: string;

  @ApiProperty({ description: 'UUID del usuario que creo el grupo.', format: 'uuid' })
  createdBy!: string;

  @ApiProperty({ description: 'Fecha de creacion del grupo.', format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ description: 'Fecha de la ultima actualizacion del grupo.', format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Indica si el grupo esta archivado.', example: false })
  archived!: boolean;

  @ApiPropertyOptional({
    description: 'Fecha en que se archivo el grupo; null si esta activo.',
    format: 'date-time',
    nullable: true,
  })
  archivedAt!: Date | null;
}
