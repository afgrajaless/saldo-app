import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';

/** Modulo de usuarios: expone el repositorio para auth y otros modulos. */
@Module({
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
