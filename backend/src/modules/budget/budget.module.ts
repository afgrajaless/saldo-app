import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';

/** Modulo de presupuesto: resumen mensual a partir de categorias y movimientos. */
@Module({
  imports: [AuthModule, CategoriesModule, TransactionsModule],
  controllers: [BudgetController],
  providers: [BudgetService],
})
export class BudgetModule {}
