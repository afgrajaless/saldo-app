import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DebtsModule } from '../debts/debts.module';
import { UsuryController } from './usury.controller';
import { UsuryRepository } from './usury.repository';
import { UsuryService } from './usury.service';

/** Modulo de usura: catalogo de topes y evaluacion de deudas. */
@Module({
  imports: [AuthModule, DebtsModule],
  controllers: [UsuryController],
  providers: [UsuryService, UsuryRepository],
})
export class UsuryModule {}
