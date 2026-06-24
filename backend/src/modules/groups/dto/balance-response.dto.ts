import { ApiProperty } from '@nestjs/swagger';

/** DTO de un miembro con su saldo neto en el grupo. */
export class MemberBalanceDto {
  @ApiProperty({ description: 'UUID del miembro', format: 'uuid', example: 'a1b2c3d4-...' })
  memberId: string;

  @ApiProperty({ description: 'Nombre visible del miembro en el grupo', example: 'Ana García' })
  displayName: string;

  /**
   * Neto del miembro: positivo = le deben, negativo = debe.
   * Valor 0 significa que está a mano con el grupo.
   */
  @ApiProperty({
    description: 'Saldo neto del miembro. Positivo: le deben dinero. Negativo: debe dinero.',
    example: 60000,
  })
  net: number;
}

/** DTO de una deuda pairwise entre dos miembros. */
export class DebtDto {
  @ApiProperty({ description: 'UUID del miembro que debe', format: 'uuid' })
  fromMemberId: string;

  @ApiProperty({ description: 'Nombre del miembro que debe', example: 'Bruno' })
  fromName: string;

  @ApiProperty({ description: 'UUID del miembro al que se le debe', format: 'uuid' })
  toMemberId: string;

  @ApiProperty({ description: 'Nombre del miembro al que se le debe', example: 'Ana García' })
  toName: string;

  @ApiProperty({ description: 'Monto a pagar (siempre positivo)', example: 30000 })
  amount: number;
}

/** DTO de respuesta del endpoint de saldo del grupo. */
export class BalanceResponseDto {
  @ApiProperty({
    description: 'Saldo neto de cada miembro activo del grupo.',
    type: [MemberBalanceDto],
  })
  members: MemberBalanceDto[];

  @ApiProperty({
    description:
      'Lista de deudas pairwise derivadas de los saldos netos. Indica quién le debe a quién y cuánto.',
    type: [DebtDto],
  })
  debts: DebtDto[];
}
