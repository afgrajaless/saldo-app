import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Datos opcionales para registrar el pago como movimiento personal del usuario. */
export class RecordPersonalDto {
  @ApiProperty({
    description: 'UUID de la cuenta del usuario desde la que se realiza el pago.',
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  accountId!: string;

  @ApiProperty({
    description: 'UUID de la categoría con la que se registra el movimiento personal.',
    format: 'uuid',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsUUID()
  categoryId!: string;
}

/** Datos necesarios para registrar la liquidacion de una deuda entre dos miembros del grupo. */
export class CreateSettlementDto {
  @ApiProperty({
    description: 'UUID del miembro que realiza el pago (el que debe dinero).',
    format: 'uuid',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @IsUUID()
  fromMemberId!: string;

  @ApiProperty({
    description: 'UUID del miembro que recibe el pago (el que se le debe el dinero).',
    format: 'uuid',
    example: 'd4e5f6a7-b8c9-0123-defa-234567890123',
  })
  @IsUUID()
  toMemberId!: string;

  @ApiProperty({
    description: 'Monto pagado en la liquidación (mayor que cero, en pesos colombianos).',
    example: 50000,
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    description: 'Fecha en que se realizó la liquidación (ISO 8601: YYYY-MM-DD).',
    example: '2026-06-24',
  })
  @IsDateString()
  settledOn!: string;

  @ApiPropertyOptional({
    description:
      'Si se indica, registra el pago como movimiento personal en la cuenta y categoría especificadas. ' +
      'El movimiento será un egreso si el usuario autenticado es el pagador (from), o un ingreso si es el receptor (to).',
    type: RecordPersonalDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecordPersonalDto)
  recordPersonal?: RecordPersonalDto;
}
