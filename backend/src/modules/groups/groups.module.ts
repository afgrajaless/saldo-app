import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupsController } from './groups.controller';
import { GroupsRepository } from './groups.repository';
import { GroupsService } from './groups.service';
import { ExpensesRepository } from './expenses.repository';
import { ExpensesService } from './expenses.service';

/** Modulo de grupos de gasto compartido. */
@Module({
  imports: [AuthModule],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository, ExpensesService, ExpensesRepository],
  exports: [GroupsRepository, GroupsService, ExpensesRepository, ExpensesService],
})
export class GroupsModule {}
