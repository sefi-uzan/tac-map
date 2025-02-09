/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors(environment.cors);

  const port = environment.port;
  await app.listen(port);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`
  );
}

bootstrap();
