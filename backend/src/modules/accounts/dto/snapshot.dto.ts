import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNumber, Min } from 'class-validator';

/** Datos para registrar el saldo real de una cuenta en una fecha. */
export class CreateSnapshotDto {
  @ApiProperty({ description: 'Saldo de la cuenta en la fecha.', example: 1112500, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  balance!: number;

  @ApiProperty({ description: 'Fecha del saldo (YYYY-MM-DD).', example: '2026-06-20' })
  @IsISO8601({ strict: true })
  asOfDate!: string;
}

/** Representacion de un snapshot de saldo. */
export class SnapshotResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1112500 })
  balance!: number;

  @ApiProperty({ example: '2026-06-20' })
  asOfDate!: string;
}
