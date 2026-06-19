import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './types/jwt-payload';

/** Endpoints de autenticacion: registro, login, refresco y perfil. */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registra un nuevo usuario.
   * @param dto - Datos de registro.
   * @returns Tokens de sesion y perfil del usuario.
   */
  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado.', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'El correo ya esta registrado.' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * Inicia sesion con correo y contrasena.
   * @param dto - Credenciales.
   * @returns Tokens de sesion y perfil del usuario.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesion' })
  @ApiResponse({ status: 200, description: 'Sesion iniciada.', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas.' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * Renueva la sesion con un refresh token valido.
   * @param dto - Refresh token.
   * @returns Un nuevo par de tokens y el perfil del usuario.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens de sesion' })
  @ApiResponse({ status: 200, description: 'Tokens renovados.', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token invalido o expirado.' })
  refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * Devuelve el usuario autenticado a partir del token de acceso.
   * @param user - Payload del JWT inyectado por el guard.
   * @returns El identificador y correo del usuario en sesion.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener el usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Usuario en sesion.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  me(@CurrentUser() user: JwtPayload): { id: string; email: string } {
    return { id: user.sub, email: user.email };
  }
}
