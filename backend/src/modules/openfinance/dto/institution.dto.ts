import { ApiProperty } from '@nestjs/swagger';

/** Institución disponible para conectar. */
export class InstitutionDto {
  @ApiProperty({ description: 'Id de la institución.', example: 'banco-001' })
  id!: string;
  @ApiProperty({ description: 'Nombre de la institución.', example: 'Banco Ejemplo Uno' })
  name!: string;
}
