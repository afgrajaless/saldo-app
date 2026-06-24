import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representacion de un grupo en las respuestas de la API. */
export class GroupResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Apartamento 301' })
  name!: string;

  @ApiProperty({ description: 'UUID del usuario que creo el grupo.', format: 'uuid' })
  createdBy!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
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
