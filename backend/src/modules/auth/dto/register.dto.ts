import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** Datos para registrar un nuevo usuario. */
export class RegisterDto {
  @ApiProperty({
    description: 'Correo electronico del usuario (sera el identificador de acceso).',
    example: 'juan.perez@example.com',
  })
  @IsEmail({}, { message: 'El correo no tiene un formato valido.' })
  email!: string;

  @ApiProperty({
    description: 'Contrasena en texto plano (se almacena con hash Argon2).',
    example: 'ClaveSegura123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres.' })
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    description: 'Nombre completo del usuario.',
    example: 'Juan Perez',
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(120)
  fullName!: string;
}
