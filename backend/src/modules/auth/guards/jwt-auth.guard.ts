import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload';

/** Peticion HTTP con el usuario autenticado adjuntado. */
export interface RequestWithUser extends Request {
  user?: JwtPayload;
}

/**
 * Guard que protege rutas exigiendo un JWT de acceso valido en el header
 * Authorization (esquema Bearer). Si es valido, adjunta el payload a la peticion.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Valida el token de acceso de la peticion.
   * @param context - Contexto de ejecucion de NestJS.
   * @returns `true` si el token es valido.
   * @throws UnauthorizedException si falta el token o es invalido.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Token de acceso no proporcionado.');
    }
    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      return true;
    } catch {
      throw new UnauthorizedException('Token de acceso invalido o expirado.');
    }
  }

  /**
   * Extrae el token Bearer del header Authorization.
   * @param request - Peticion HTTP entrante.
   * @returns El token si esta presente, o `undefined`.
   */
  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
