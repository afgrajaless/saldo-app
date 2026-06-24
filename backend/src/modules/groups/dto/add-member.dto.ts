import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Datos para agregar un miembro fantasma a un grupo. */
export class AddMemberDto {
  @ApiProperty({
    description: 'Nombre que identificara al miembro dentro del grupo.',
    example: 'Juan (compañero de aparto)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;
}
