import { ApiProperty } from '@nestjs/swagger';
import { OFWidgetToken } from '../../../domain/openfinance/types';

/** Token efímero para inicializar el widget de consentimiento en el cliente. */
export class WidgetTokenDto {
  @ApiProperty({ description: 'Token de acceso para abrir el widget.', example: 'eyJ...' })
  accessToken!: string;

  @ApiProperty({
    description: 'Fecha de expiración del token (ISO) o null si no aplica.',
    example: null,
    nullable: true,
  })
  expiresAt!: string | null;

  /**
   * Construye el DTO desde el resultado del proveedor.
   * @param token - Token de widget en forma canónica OF.
   * @returns DTO listo para responder.
   */
  static from(token: OFWidgetToken): WidgetTokenDto {
    const dto = new WidgetTokenDto();
    dto.accessToken = token.accessToken;
    dto.expiresAt = token.expiresAt;
    return dto;
  }
}
