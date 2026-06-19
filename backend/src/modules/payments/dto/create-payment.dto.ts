import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { PrepaymentMode } from '../../../domain/amortization/prepayment.types';
import { paymentTypeEnum } from '../../../db/schema';

/** Datos para registrar un pago (regular o abono a capital). */
export class CreatePaymentDto {
  @ApiProperty({
    description: 'Tipo de pago: regular (paga una cuota) o abono_capital (recalcula el cronograma).',
    enum: paymentTypeEnum.enumValues,
    example: 'regular',
  })
  @IsIn(paymentTypeEnum.enumValues)
  type!: (typeof paymentTypeEnum.enumValues)[number];

  @ApiProperty({ description: 'Monto del pago.', example: 400000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto debe ser mayor que cero.' })
  amount!: number;

  @ApiProperty({ description: 'Fecha del pago (YYYY-MM-DD).', example: '2026-03-15' })
  @IsISO8601({ strict: true })
  paymentDate!: string;

  @ApiPropertyOptional({
    description: 'Cuota a la que se aplica el pago regular (UUID).',
    format: 'uuid',
  })
  @ValidateIf((dto: CreatePaymentDto) => dto.type === 'regular')
  @IsOptional()
  @IsUUID()
  installmentId?: string;

  @ApiPropertyOptional({
    description:
      'Modalidad del abono a capital (requerido si type=abono_capital): REDUCE_TERM conserva la cuota y reduce el plazo; REDUCE_INSTALLMENT conserva el plazo y baja la cuota.',
    enum: PrepaymentMode,
    example: PrepaymentMode.REDUCE_TERM,
  })
  @ValidateIf((dto: CreatePaymentDto) => dto.type === 'abono_capital')
  @IsIn(Object.values(PrepaymentMode), {
    message: 'El modo de abono debe ser REDUCE_TERM o REDUCE_INSTALLMENT.',
  })
  mode?: PrepaymentMode;
}
