import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de una deuda del usuario autenticado en un grupo especifico.
 * Representa cuanto debe el usuario al acreedor dentro de ese grupo.
 */
export class MyGroupDebtDto {
  @ApiProperty({
    description: 'UUID del grupo donde existe la deuda.',
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  groupId: string;

  @ApiProperty({
    description: 'Nombre del grupo donde existe la deuda.',
    example: 'Viaje a Cartagena',
  })
  groupName: string;

  @ApiProperty({
    description: 'UUID del miembro (en el grupo) al que el usuario le debe.',
    format: 'uuid',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  creditorMemberId: string;

  @ApiProperty({
    description: 'Nombre visible del acreedor dentro del grupo.',
    example: 'Ana García',
  })
  creditorName: string;

  @ApiProperty({
    description: 'Monto total que el usuario debe al acreedor en este grupo (descontando settlements).',
    example: 30000,
  })
  amountOwed: number;

  @ApiProperty({
    description: 'Porción del monto adeudado que proviene de partes pendientes de confirmar.',
    example: 30000,
  })
  pendingAmount: number;

  @ApiProperty({
    description: 'Indica si alguna parte de la deuda está pendiente de confirmación.',
    example: true,
  })
  hasPending: boolean;
}
