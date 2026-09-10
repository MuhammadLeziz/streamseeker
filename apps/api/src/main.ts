import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

const DEFAULT_PORT = 3000;
const DEFAULT_WEB_ORIGIN = 'http://localhost:4200';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // The front end already calls `/api/...`; the prefix lives here rather than
  // in every controller so a reverse proxy has one path to route.
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN).split(',').map((value) => value.trim()),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Query strings arrive as text, so transformation is not optional here:
      // without it every number and boolean reaches the service as a string.
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port);

  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
