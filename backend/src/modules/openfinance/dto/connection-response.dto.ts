import { ApiProperty } from '@nestjs/swagger';
import { ConnectionRow } from '../open-finance.repository';

/** Conexión de Open Finance expuesta al cliente. */
export class ConnectionResponseDto {
  @ApiProperty({ example: 'uuid' }) id!: string;
  @ApiProperty({ example: 'banco-001' }) institutionId!: string;
  @ApiProperty({ example: 'Banco Ejemplo Uno' }) institutionName!: string;
  @ApiProperty({ enum: ['pending', 'active', 'expired', 'revoked', 'error'] }) status!: string;
  @ApiProperty({ nullable: true, example: '2026-06-25T12:00:00.000Z' }) lastSyncedAt!: string | null;

  /**
   * Construye el DTO desde una fila de conexión.
   * @param row - Fila de la tabla open_finance_connections.
   * @returns DTO listo para serializar al cliente.
   */
  static from(row: ConnectionRow): ConnectionResponseDto {
    return {
      id: row.id,
      institutionId: row.institutionId,
      institutionName: row.institutionName,
      status: row.status,
      lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    };
  }
}
