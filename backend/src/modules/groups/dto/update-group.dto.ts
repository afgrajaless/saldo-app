import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Datos para actualizar un grupo (nombre o estado de archivo). */
export class UpdateGroupDto {
  @ApiPropertyOptional({ description: 'Nuevo nombre del grupo.', example: 'Casa 2025' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    description: 'true para archivar el grupo, false para restaurarlo.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
