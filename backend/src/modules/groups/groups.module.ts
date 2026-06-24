import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { GroupsController } from './groups.controller';
import { GroupsRepository } from './groups.repository';
import { GroupsService } from './groups.service';
import { ExpensesRepository } from './expenses.repository';
import { ExpensesService } from './expenses.service';
import { BalanceRepository } from './balance.repository';
import { BalanceService } from './balance.service';
import { SettlementsRepository } from './settlements.repository';
import { SettlementsService } from './settlements.service';

/** Modulo de grupos de gasto compartido. */
@Module({
  imports: [AuthModule, AccountsModule, CategoriesModule],
  controllers: [GroupsController],
  providers: [
    GroupsRepository,
    GroupsService,
    ExpensesRepository,
    ExpensesService,
    BalanceRepository,
    BalanceService,
    SettlementsRepository,
    SettlementsService,
  ],
  exports: [
    GroupsRepository,
    GroupsService,
    ExpensesRepository,
    ExpensesService,
    BalanceService,
    SettlementsRepository,
    SettlementsService,
  ],
})
export class GroupsModule {}
