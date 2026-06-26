import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/** Entornos de ejecucion admitidos. */
export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Esquema tipado de las variables de entorno. Se valida al arrancar la app:
 * si falta o es invalida alguna variable critica, el proceso no inicia.
 */
export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  PORT = 3000;

  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN = '15m';

  @IsString()
  @MinLength(16)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN = '7d';

  @IsString()
  @IsOptional()
  CORS_ORIGIN = '*';

  /** Proveedor de Open Finance activo: 'mock' (default) o 'belvo'. */
  @IsString()
  @IsOptional()
  OPEN_FINANCE_PROVIDER = 'mock';

  /** URL base de la API de Belvo (sandbox o producción). Sólo si se usa Belvo. */
  @IsString()
  @IsOptional()
  BELVO_BASE_URL = 'https://sandbox.belvo.com';

  /** Secret ID de Belvo (HTTP Basic). Sólo si OPEN_FINANCE_PROVIDER=belvo. */
  @IsString()
  @IsOptional()
  BELVO_SECRET_ID?: string;

  /** Secret password de Belvo (HTTP Basic). Sólo si OPEN_FINANCE_PROVIDER=belvo. */
  @IsString()
  @IsOptional()
  BELVO_SECRET_PASSWORD?: string;
}

/**
 * Valida y normaliza las variables de entorno crudas.
 * @param config - Mapa de variables de entorno sin tipar (process.env).
 * @returns La instancia tipada y validada de configuracion.
 * @throws Error si alguna variable requerida falta o es invalida.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Configuracion de entorno invalida:\n${errors
        .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
        .join('\n')}`,
    );
  }
  return validated;
}
