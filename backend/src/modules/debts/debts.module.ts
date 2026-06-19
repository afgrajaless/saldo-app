import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DebtsController } from './debts.controller';
import { DebtsRepository } from './debts.repository';
import { DebtsService } from './debts.service';

/** Modulo de obligaciones (deudas). Reusa el JwtAuthGuard de AuthModule. */
@Module({
  imports: [AuthModule],
  controllers: [DebtsController],
  providers: [DebtsService, DebtsRepository],
  exports: [DebtsRepository],
})
export class DebtsModule {}
