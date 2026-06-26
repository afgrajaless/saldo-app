import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/** Datos para crear una invitacion a un grupo. */
export class CreateInviteDto {
  @ApiPropertyOptional({
    description:
      'UUID del miembro fantasma que puede reclamar esta invitación. ' +
      'Si se omite, la invitación es abierta y crea un miembro real nuevo al usarse.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}
