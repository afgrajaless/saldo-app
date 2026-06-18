import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** Modulo del endpoint de salud. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
