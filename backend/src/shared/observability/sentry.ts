import * as Sentry from '@sentry/node';

/**
 * Inicializa Sentry para observabilidad de errores en produccion. Es opcional:
 * si no hay DSN, no hace nada (la app corre igual en local/dev).
 * @param dsn - DSN del proyecto Sentry (vacio/undefined => deshabilitado).
 * @param environment - Entorno de ejecucion (p. ej. 'production').
 * @returns true si Sentry quedo activo.
 */
export function initSentry(dsn: string | undefined, environment: string): boolean {
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment,
    // Muestreo conservador de trazas de rendimiento (10 %).
    tracesSampleRate: 0.1,
  });
  return true;
}
