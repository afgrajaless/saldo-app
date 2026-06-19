import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/** Credenciales para iniciar sesion. */
export class LoginDto {
  @ApiProperty({
    description: 'Correo electronico registrado.',
    example: 'juan.perez@example.com',
  })
  @IsEmail({}, { message: 'El correo no tiene un formato valido.' })
  email!: string;

  @ApiProperty({
    description: 'Contrasena del usuario.',
    example: 'ClaveSegura123',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
