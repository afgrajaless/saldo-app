import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from './schema';

/** Token de inyeccion del cliente Drizzle tipado. */
export const DRIZZLE = Symbol('DRIZZLE');

/** Tipo del cliente Drizzle con el schema de Saldo embebido. */
export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Modulo global de base de datos. Crea un unico cliente Drizzle sobre Neon
 * (driver postgres.js) y lo expone mediante el token DRIZZLE para inyectarlo en
 * los repositorios/servicios.
 */
@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      /**
       * Construye el cliente Drizzle a partir de la cadena de conexion.
       * @param config - Servicio de configuracion tipado.
       * @returns El cliente Drizzle listo para usarse.
       */
      useFactory: (config: ConfigService): Database => {
        const connectionString = config.getOrThrow<string>('DATABASE_URL');
        // max: 1 reduce conexiones en serverless (Neon); ssl requerido por Neon.
        const client = postgres(connectionString, { max: 10, ssl: 'require' });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
  imports: [ConfigModule],
})
export class DatabaseModule {}
