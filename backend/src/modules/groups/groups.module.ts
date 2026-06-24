import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupsController } from './groups.controller';
import { GroupsRepository } from './groups.repository';
import { GroupsService } from './groups.service';

/** Modulo de grupos de gasto compartido. */
@Module({
  imports: [AuthModule],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository],
  exports: [GroupsRepository, GroupsService],
})
export class GroupsModule {}
