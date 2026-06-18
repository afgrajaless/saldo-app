import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

/** Respuesta del chequeo de salud del servicio. */
interface HealthStatus {
  status: 'ok';
  service: string;
  timestamp: string;
}

/** Controlador de salud para monitoreo y smoke tests (no toca la base de datos). */
@ApiTags('health')
@Controller('health')
export class HealthController {
  /**
   * Verifica que la API esta arriba y respondiendo.
   * @returns Estado del servicio con marca de tiempo.
   */
  @Get()
  @ApiOperation({ summary: 'Estado del servicio (liveness)' })
  @ApiResponse({ status: 200, description: 'El servicio esta operativo.' })
  check(): HealthStatus {
    return {
      status: 'ok',
      service: 'saldo-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
