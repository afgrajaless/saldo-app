import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './db/database.module';
import { HealthModule } from './health/health.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CardsModule } from './modules/cards/cards.module';
import { AuthModule } from './modules/auth/auth.module';
import { BudgetModule } from './modules/budget/budget.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { GroupsModule } from './modules/groups/groups.module';
import { DebtsModule } from './modules/debts/debts.module';
import { OpenFinanceModule } from './modules/openfinance/open-finance.module';
import { ImportModule } from './modules/import/import.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { UsersModule } from './modules/users/users.module';
import { UsuryModule } from './modules/usury/usury.module';
import { SecurityModule } from './shared/security/security.module';

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
    // Rate limiting global: 120 peticiones por minuto por IP (los endpoints
    // sensibles de auth lo restringen mas con @Throttle).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    // Habilita tareas programadas (@Cron), p. ej. la limpieza de refresh tokens.
    ScheduleModule.forRoot(),
    SecurityModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    DebtsModule,
    PaymentsModule,
    UsuryModule,
    CategoriesModule,
    AccountsModule,
    CardsModule,
    TransactionsModule,
    TransfersModule,
    ImportModule,
    BudgetModule,
    GroupsModule,
    OpenFinanceModule,
  ],
  // Aplica el rate limiting a toda la app (las rutas lo afinan con @Throttle).
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
