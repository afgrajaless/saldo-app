import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Datos para crear un grupo de gasto compartido. */
export class CreateGroupDto {
  @ApiProperty({ description: 'Nombre del grupo.', example: 'Apartamento 301' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}
