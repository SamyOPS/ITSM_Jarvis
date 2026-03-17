import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { getAppConfig } from './infrastructure/config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = getAppConfig(configService);

  app.enableCors({
    origin: appConfig.frontendUrl,
  });

  await app.listen(appConfig.port);
}

void bootstrap();
