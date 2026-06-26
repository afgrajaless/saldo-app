import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../../shared/security/password.service';
import { UserRow, UsersRepository } from '../users/users.repository';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload';

/**
 * Servicio de autenticacion: registro, inicio de sesion y renovacion de tokens.
 * Emite un JWT de acceso de vida corta y un refresh token rotatorio.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Registra un nuevo usuario y devuelve sus tokens de sesion.
   * @param dto - Correo, contrasena y nombre completo.
   * @returns Tokens de acceso/refresco y el perfil del usuario.
   * @throws ConflictException si el correo ya esta registrado.
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = this.normalizeEmail(dto.email);
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException('El correo ya esta registrado.');
    }
    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.usersRepository.create({
      email,
      passwordHash,
      fullName: dto.fullName.trim(),
    });
    return this.buildAuthResponse(user);
  }

  /**
   * Valida credenciales e inicia sesion.
   * @param dto - Correo y contrasena.
   * @returns Tokens de acceso/refresco y el perfil del usuario.
   * @throws UnauthorizedException si las credenciales son invalidas.
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }
    const valid = await this.passwordService.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }
    return this.buildAuthResponse(user);
  }

  /**
   * Renueva la sesion a partir de un refresh token valido (rotacion de tokens).
   * @param refreshToken - Refresh token emitido previamente.
   * @returns Un nuevo par de tokens y el perfil del usuario.
   * @throws UnauthorizedException si el refresh token es invalido o el usuario no existe.
   */
  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido o expirado.');
    }
    const user = await this.usersRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('El usuario ya no existe.');
    }
    return this.buildAuthResponse(user);
  }

  /**
   * Devuelve el perfil del usuario en sesion, leyendolo de la base de datos.
   * @param userId - UUID del usuario (extraido del JWT).
   * @returns El perfil publico del usuario.
   * @throws UnauthorizedException si el usuario ya no existe.
   */
  async me(userId: string): Promise<UserProfileDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('El usuario ya no existe.');
    }
    return this.toProfile(user);
  }

  /**
   * Construye la respuesta de autenticacion con tokens y perfil.
   * @param user - Usuario autenticado.
   * @returns La respuesta con ambos tokens y el perfil publico.
   */
  private async buildAuthResponse(user: UserRow): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);
    return { accessToken, refreshToken, user: this.toProfile(user) };
  }

  /**
   * Mapea una fila de usuario a su perfil publico (sin datos sensibles).
   * @param user - Fila de usuario.
   * @returns El perfil publico.
   */
  private toProfile(user: UserRow): UserProfileDto {
    return { id: user.id, email: user.email, fullName: user.fullName };
  }

  /**
   * Normaliza un correo: recorta espacios y lo pasa a minusculas.
   * @param email - Correo crudo.
   * @returns El correo normalizado.
   */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
