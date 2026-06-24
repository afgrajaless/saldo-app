import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MemberShare } from '../../../domain/split/split-expense';

/** Parte exacta de un gasto para un miembro especifico. */
export class ExactShareDto implements MemberShare {
  @ApiProperty({ description: 'UUID del miembro participante.', format: 'uuid' })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ description: 'Monto exacto asignado a este miembro (mayor que cero).', example: 35000 })
  @IsNumber()
  @Min(0.01)
  shareAmount!: number;
}

/** Datos para crear un gasto compartido dentro de un grupo. */
export class CreateExpenseDto {
  @ApiProperty({
    description: 'UUID del miembro que pago el gasto.',
    format: 'uuid',
  })
  @IsUUID()
  paidByMemberId!: string;

  @ApiProperty({
    description: 'Monto total del gasto en pesos colombianos (mayor que cero).',
    example: 90000,
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Descripcion opcional del gasto.',
    example: 'Cena del viernes',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Fecha en que ocurrio el gasto (ISO 8601: YYYY-MM-DD).',
    example: '2026-06-10',
  })
  @IsDateString()
  occurredOn!: string;

  @ApiProperty({
    description: 'Metodo de division del gasto.',
    enum: ['equal', 'exact'],
    example: 'equal',
  })
  @IsEnum(['equal', 'exact'])
  splitMethod!: 'equal' | 'exact';

  @ApiPropertyOptional({
    description:
      'Lista de UUIDs de los miembros participantes. Requerido si splitMethod es "equal".',
    type: [String],
    format: 'uuid',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  participantMemberIds?: string[];

  @ApiPropertyOptional({
    description:
      'Partes exactas por miembro. Requerido si splitMethod es "exact". La suma debe ser igual al monto total.',
    type: [ExactShareDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExactShareDto)
  exactShares?: ExactShareDto[];
}
