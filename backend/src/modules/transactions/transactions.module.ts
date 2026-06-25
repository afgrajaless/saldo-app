import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { AuthModule } from '../auth/auth.module';
import { CardsModule } from '../cards/cards.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

/** Modulo de transacciones (movimientos). Reusa categorias, cuentas y tarjetas. */
@Module({
  imports: [AuthModule, CategoriesModule, AccountsModule, CardsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository],
  exports: [TransactionsRepository],
})
export class TransactionsModule {}
