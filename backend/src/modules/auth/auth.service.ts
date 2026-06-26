import { createHash } from 'node:crypto';
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
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { JwtPayload } from './types/jwt-payload';

/**
 * Servicio de autenticacion: registro, inicio de sesion y renovacion de tokens.
 * Emite un JWT de acceso de vida corta y un refresh token rotatorio cuyo hash se
 * persiste para permitir revocacion (logout / robo) y rotacion en cada refresco.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokensRepository: RefreshTokensRepository,
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
      throw new ConflictException('El correo ya está registrado.');
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
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    const valid = await this.passwordService.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas.');
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
      throw new UnauthorizedException('Refresh token inválido o expirado.');
    }
    // El token debe seguir vigente en BD (no revocado ni rotado); si no, se rechaza.
    const stored = await this.refreshTokensRepository.findActiveByHash(this.hashToken(refreshToken));
    if (!stored) {
      throw new UnauthorizedException('Refresh token revocado o ya utilizado.');
    }
    const user = await this.usersRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('El usuario ya no existe.');
    }
    // Rotacion: se revoca el token presentado y se emite uno nuevo.
    await this.refreshTokensRepository.revoke(stored.id);
    return this.buildAuthResponse(user);
  }

  /**
   * Cierra una sesion revocando el refresh token presentado (idempotente).
   * @param refreshToken - Refresh token a revocar.
   */
  async logout(refreshToken: string): Promise<void> {
    const stored = await this.refreshTokensRepository.findActiveByHash(this.hashToken(refreshToken));
    if (stored) {
      await this.refreshTokensRepository.revoke(stored.id);
    }
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
    // Persiste el hash del refresh token para poder revocarlo/rotarlo despues.
    await this.refreshTokensRepository.create(
      user.id,
      this.hashToken(refreshToken),
      this.refreshTokenExpiry(refreshToken),
    );
    return { accessToken, refreshToken, user: this.toProfile(user) };
  }

  /**
   * Calcula el hash SHA-256 (hex) de un refresh token para almacenarlo/compararlo.
   * @param token - Refresh token en claro.
   * @returns Hash hexadecimal del token.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Extrae la fecha de expiracion de un refresh token a partir de su claim `exp`.
   * @param token - Refresh token firmado.
   * @returns La fecha de expiracion del token.
   */
  private refreshTokenExpiry(token: string): Date {
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) {
      throw new UnauthorizedException('Refresh token sin expiración.');
    }
    return new Date(decoded.exp * 1000);
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
