import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsuryRepository } from '../usury/usury.repository';
import { CardsController } from './cards.controller';
import { CardsRepository } from './cards.repository';
import { CardsService } from './cards.service';

/** Modulo de tarjetas de credito. */
@Module({
  imports: [AuthModule],
  controllers: [CardsController],
  providers: [CardsService, CardsRepository, UsuryRepository],
  exports: [CardsRepository],
})
export class CardsModule {}
