import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

/** Datos para crear una cuenta (Nequi, efectivo, banco, etc.). */
export class CreateAccountDto {
  @ApiProperty({ description: 'Nombre de la cuenta.', example: 'Nequi' })
  @IsString()
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({ description: 'Color hex para la UI.', example: '#2D6FB0' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
