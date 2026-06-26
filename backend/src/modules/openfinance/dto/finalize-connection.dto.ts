import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Cuerpo para finalizar una conexión iniciada por widget. El cliente envía la
 * institución y el identificador externo (p. ej. el link_id de Belvo) obtenido
 * tras autenticar al usuario en su banco.
 */
export class FinalizeConnectionDto {
  @ApiProperty({ description: 'Id de la institución conectada.', example: 'bancolombia_co_retail' })
  @IsString()
  @IsNotEmpty()
  institutionId!: string;

  @ApiProperty({
    description: 'Identificador externo de la conexión emitido por el proveedor (link_id).',
    example: 'b91835f1-1c5a-4f3e-9a2e-2c1d0a9b8c7d',
  })
  @IsString()
  @IsNotEmpty()
  externalConnectionId!: string;
}
