import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

/** Datos para unirse a un grupo mediante un codigo de invitacion. */
export class JoinGroupDto {
  @ApiProperty({
    description: 'Código de invitación de 8 caracteres (alfanumérico sin ambiguos).',
    example: 'ABCD2345',
    minLength: 8,
    maxLength: 8,
  })
  @IsString()
  @Length(8, 8)
  @Matches(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/, {
    message: 'El codigo debe tener exactamente 8 caracteres validos (A-Z sin I/O, 2-9).',
  })
  code!: string;
}
