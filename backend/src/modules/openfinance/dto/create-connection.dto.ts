import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Cuerpo para crear una conexión de Open Finance. */
export class CreateConnectionDto {
  @ApiProperty({ description: 'Id de la institución a conectar.', example: 'banco-001' })
  @IsString()
  @IsNotEmpty()
  institutionId!: string;
}
