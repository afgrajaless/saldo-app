import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Datos para registrar una transferencia entre cuentas. */
export class CreateTransferDto {
  @ApiProperty({ description: 'Cuenta de origen.', format: 'uuid' })
  @IsUUID()
  fromAccountId!: string;

  @ApiProperty({ description: 'Cuenta de destino.', format: 'uuid' })
  @IsUUID()
  toAccountId!: string;

  @ApiProperty({ description: 'Monto transferido.', example: 200000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto debe ser mayor que cero.' })
  amount!: number;

  @ApiProperty({ description: 'Fecha de la transferencia (YYYY-MM-DD).', example: '2026-06-10' })
  @IsISO8601({ strict: true })
  occurredOn!: string;

  @ApiPropertyOptional({ description: 'Descripción opcional.', example: 'Paso a efectivo' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
