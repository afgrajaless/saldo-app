import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

/** Campos editables de una cuenta. */
export class UpdateAccountDto {
  @ApiPropertyOptional({ description: 'Nombre de la cuenta.', example: 'Nequi' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ description: 'Color hex para la UI.', example: '#2D6FB0' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
