import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokensRepository } from './refresh-tokens.repository';

/**
 * Tarea programada que purga los refresh tokens expirados de la base de datos,
 * para que la tabla `refresh_tokens` no crezca indefinidamente.
 */
@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(private readonly refreshTokensRepository: RefreshTokensRepository) {}

  /**
   * Borra los refresh tokens expirados. Se ejecuta a diario (3:00 a. m.) y
   * deja traza de cuantas filas se eliminaron.
   * @returns Cantidad de tokens eliminados.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpired(): Promise<number> {
    const deleted = await this.refreshTokensRepository.deleteExpired();
    if (deleted > 0) {
      this.logger.log(`Limpieza de refresh tokens: ${deleted} expirados eliminados.`);
    }
    return deleted;
  }
}
