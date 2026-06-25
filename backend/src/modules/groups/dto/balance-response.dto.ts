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

/** DTO de una deuda directa de un deudor hacia el pagador de un gasto, con desglose de pendiente. */
export class DebtDto {
  @ApiProperty({ description: 'UUID del miembro que debe', format: 'uuid' })
  fromMemberId: string;

  @ApiProperty({ description: 'Nombre del miembro que debe', example: 'Bruno' })
  fromName: string;

  @ApiProperty({ description: 'UUID del miembro al que se le debe', format: 'uuid' })
  toMemberId: string;

  @ApiProperty({ description: 'Nombre del miembro al que se le debe', example: 'Ana García' })
  toName: string;

  @ApiProperty({
    description: 'Monto total adeudado descontando settlements (siempre positivo).',
    example: 30000,
  })
  owed: number;

  @ApiProperty({
    description: 'Porción del monto adeudado que aún está pendiente de confirmar por el deudor.',
    example: 15000,
  })
  pendingOwed: number;

  @ApiProperty({
    description: 'Indica si hay al menos una parte pendiente de confirmación en esta deuda.',
    example: true,
  })
  hasPending: boolean;
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
      'Lista de deudas directas (deudor → pagador) del grupo. Incluye el monto pendiente de confirmar por parte del deudor.',
    type: [DebtDto],
  })
  debts: DebtDto[];

  @ApiProperty({
    description:
      'Número de partes (shares) del usuario actual que están en estado pendiente en el grupo. Indica cuántas confirmaciones tiene por resolver.',
    example: 2,
  })
  myPendingCount: number;
}
