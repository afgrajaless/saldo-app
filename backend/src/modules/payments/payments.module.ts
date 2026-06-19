import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DebtsModule } from '../debts/debts.module';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

/** Modulo de pagos. Reusa el guard de auth y el repositorio de deudas. */
@Module({
  imports: [AuthModule, DebtsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
