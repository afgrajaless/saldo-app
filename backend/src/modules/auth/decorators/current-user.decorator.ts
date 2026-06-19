import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../types/jwt-payload';
import { RequestWithUser } from '../guards/jwt-auth.guard';

/**
 * Decorador de parametro que extrae el usuario autenticado (o una de sus
 * propiedades) de la peticion. Debe usarse en rutas protegidas por JwtAuthGuard.
 *
 * @example
 *   metodo(@CurrentUser() user: JwtPayload) {}
 *   metodo(@CurrentUser('sub') userId: string) {}
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
