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

/** Datos para registrar un movimiento (ingreso o egreso). */
export class CreateTransactionDto {
  @ApiProperty({ description: 'Categoria del movimiento.', format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({ description: 'Cuenta de la que sale/entra el dinero.', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiProperty({ description: 'Monto del movimiento.', example: 1500000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto debe ser mayor que cero.' })
  amount!: number;

  @ApiProperty({ description: 'Fecha del movimiento (YYYY-MM-DD).', example: '2026-06-05' })
  @IsISO8601({ strict: true })
  occurredOn!: string;

  @ApiPropertyOptional({ description: 'Descripcion opcional.', example: 'Pago arriendo junio' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
