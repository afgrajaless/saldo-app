import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Punto de entrada de la API. Configura seguridad (Helmet), CORS, validacion
 * global de DTOs y la documentacion Swagger, y arranca el servidor HTTP.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

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
    .setDescription('API del gestor de deuda y credito (Colombia).')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
