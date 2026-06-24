import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './db/database.module';
import { HealthModule } from './health/health.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { BudgetModule } from './modules/budget/budget.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { GroupsModule } from './modules/groups/groups.module';
import { DebtsModule } from './modules/debts/debts.module';
import { ImportModule } from './modules/import/import.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { UsersModule } from './modules/users/users.module';
import { UsuryModule } from './modules/usury/usury.module';

/**
 * Modulo raiz de la aplicacion. Carga la configuracion validada, la conexion a
 * la base de datos y los modulos de funcionalidad.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    DebtsModule,
    PaymentsModule,
    UsuryModule,
    CategoriesModule,
    AccountsModule,
    TransactionsModule,
    TransfersModule,
    ImportModule,
    BudgetModule,
    GroupsModule,
  ],
})
export class AppModule {}
