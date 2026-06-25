import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { OpenFinanceController } from './open-finance.controller';
import { OpenFinanceRepository } from './open-finance.repository';
import { OpenFinanceService } from './open-finance.service';
import { MockOpenFinanceProvider } from './provider/mock-open-finance.provider';
import { OPEN_FINANCE_PROVIDER, OpenFinanceProvider } from './provider/open-finance.provider';

/**
 * Módulo de Open Finance.
 * Registra el controller, el servicio, el repositorio y selecciona el proveedor
 * de datos externos según la variable de entorno OPEN_FINANCE_PROVIDER (default: 'mock').
 * DatabaseModule y ConfigModule son globales, por lo que DRIZZLE y ConfigService
 * están disponibles sin importarlos aquí.
 */
@Module({
  imports: [AuthModule],
  controllers: [OpenFinanceController],
  providers: [
    OpenFinanceService,
    OpenFinanceRepository,
    MockOpenFinanceProvider,
    {
      provide: OPEN_FINANCE_PROVIDER,
      inject: [ConfigService, MockOpenFinanceProvider],
      useFactory: (config: ConfigService, mock: MockOpenFinanceProvider): OpenFinanceProvider => {
        const kind = config.get<string>('OPEN_FINANCE_PROVIDER') ?? 'mock';
        // En el futuro: if (kind === 'belvo') return belvoAdapter;
        void kind;
        return mock;
      },
    },
  ],
})
export class OpenFinanceModule {}
