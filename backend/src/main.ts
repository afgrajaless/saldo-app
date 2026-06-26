import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './shared/observability/sentry-exception.filter';
import { initSentry } from './shared/observability/sentry';

/**
 * Punto de entrada de la API. Configura seguridad (Helmet), CORS, validacion
 * global de DTOs y la documentacion Swagger, y arranca el servidor HTTP.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Observabilidad: Sentry (opcional, solo si hay DSN). Reporta los 5xx.
  const sentryOn = initSentry(
    config.get<string>('SENTRY_DSN'),
    config.get<string>('NODE_ENV', 'development'),
  );
  if (sentryOn) {
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));
  }

  // Cabeceras de seguridad.
  app.use(helmet());

  // CORS restringido al origen del frontend.
  app.enableCors({ origin: config.get<string>('CORS_ORIGIN', '*') });

  // Prefijo comun para todos los endpoints.
  app.setGlobalPrefix('api');

  // Validacion estricta: descarta propiedades no declaradas y transforma tipos.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Documentacion OpenAPI en /api/docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Saldo API')
    .setDescription('API del gestor de deuda y crédito (Colombia).')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
