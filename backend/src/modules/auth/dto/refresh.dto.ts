import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

/** Datos para renovar la sesion a partir del refresh token. */
export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token emitido al iniciar sesión o registrarse.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsJWT({ message: 'El refresh token no es un JWT valido.' })
  refreshToken!: string;
}
