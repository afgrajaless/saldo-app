import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImportController } from './import.controller';
import { ImportRepository } from './import.repository';
import { ImportService } from './import.service';

/** Modulo de importacion de movimientos desde archivos XLSX/CSV. */
@Module({
  imports: [AuthModule],
  controllers: [ImportController],
  providers: [ImportService, ImportRepository],
})
export class ImportModule {}
