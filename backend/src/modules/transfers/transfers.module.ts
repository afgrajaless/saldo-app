import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccountsModule } from '../accounts/accounts.module';
import { TransfersController } from './transfers.controller';
import { TransfersRepository } from './transfers.repository';
import { TransfersService } from './transfers.service';

/** Modulo de transferencias entre cuentas. Reusa el repositorio de cuentas. */
@Module({
  imports: [AuthModule, AccountsModule],
  controllers: [TransfersController],
  providers: [TransfersService, TransfersRepository],
  exports: [TransfersRepository],
})
export class TransfersModule {}
