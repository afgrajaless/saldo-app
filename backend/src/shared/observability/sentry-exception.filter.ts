import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

/**
 * Filtro global que reporta a Sentry los errores del servidor (5xx) y delega el
 * resto del manejo en el filtro por defecto de Nest. Los errores esperados (4xx)
 * no se reportan para no generar ruido.
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  /**
   * Captura la excepcion, la reporta a Sentry si es 5xx y delega en Nest.
   * @param exception - Excepcion lanzada.
   * @param host - Contexto de la peticion.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500) {
      Sentry.captureException(exception);
    }
    super.catch(exception, host);
  }
}
