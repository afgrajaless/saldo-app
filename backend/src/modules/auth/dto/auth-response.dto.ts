import { ApiProperty } from '@nestjs/swagger';

/** Perfil publico del usuario (nunca expone el hash de contrasena). */
export class UserProfileDto {
  @ApiProperty({ description: 'UUID del usuario.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Correo electronico.', example: 'juan.perez@example.com' })
  email!: string;

  @ApiProperty({ description: 'Nombre completo.', example: 'Juan Perez' })
  fullName!: string;
}

/** Respuesta de autenticacion: tokens y perfil del usuario. */
export class AuthResponseDto {
  @ApiProperty({ description: 'JWT de acceso (vida corta).' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT de refresco (vida larga, para renovar el acceso).' })
  refreshToken!: string;

  @ApiProperty({ description: 'Perfil del usuario autenticado.', type: UserProfileDto })
  user!: UserProfileDto;
}
