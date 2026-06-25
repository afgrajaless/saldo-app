import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CardsController } from './cards.controller';
import { CardsRepository } from './cards.repository';
import { CardsService } from './cards.service';

/** Modulo de tarjetas de credito. */
@Module({
  imports: [AuthModule],
  controllers: [CardsController],
  providers: [CardsService, CardsRepository],
  exports: [CardsRepository],
})
export class CardsModule {}
