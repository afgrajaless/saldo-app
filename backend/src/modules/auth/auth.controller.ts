import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './types/jwt-payload';

/** Limite estricto para endpoints sensibles: 10 peticiones por minuto por IP. */
const AUTH_THROTTLE = { default: { ttl: 60000, limit: 10 } };

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
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado.', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado.' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * Inicia sesion con correo y contrasena.
   * @param dto - Credenciales.
   * @returns Tokens de sesion y perfil del usuario.
   */
  @Post('login')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Sesión iniciada.', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * Renueva la sesion con un refresh token valido.
   * @param dto - Refresh token.
   * @returns Un nuevo par de tokens y el perfil del usuario.
   */
  @Post('refresh')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens de sesión' })
  @ApiResponse({ status: 200, description: 'Tokens renovados.', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado.' })
  refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * Cierra la sesion revocando el refresh token (no podra volver a usarse).
   * @param dto - Refresh token a revocar.
   */
  @Post('logout')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar sesión (revocar el refresh token)' })
  @ApiResponse({ status: 204, description: 'Sesión cerrada.' })
  logout(@Body() dto: RefreshDto): Promise<void> {
    return this.authService.logout(dto.refreshToken);
  }

  /**
   * Devuelve el perfil del usuario autenticado, validado contra la base de datos
   * (no solo el payload del JWT): si el usuario ya no existe, responde 401. Esto
   * evita la "ghost session" en la que un token vigente sobrevive al borrado del usuario.
   * @param user - Payload del JWT inyectado por el guard.
   * @returns El perfil del usuario en sesion.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener el usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Usuario en sesión.', type: UserProfileDto })
  @ApiResponse({ status: 401, description: 'No autenticado o usuario inexistente.' })
  me(@CurrentUser() user: JwtPayload): Promise<UserProfileDto> {
    return this.authService.me(user.sub);
  }
}
