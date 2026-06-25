import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** DTO para refutar la parte propia de un gasto compartido. */
export class DisputeShareDto {
  @ApiPropertyOptional({
    description: 'Nota opcional que explica el motivo de la disputa.',
    example: 'El monto no corresponde a lo que ordene.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
