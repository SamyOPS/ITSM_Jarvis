import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getBackendRuntimeConfig } from './infrastructure/config/app-config';
import { loadEnvFile } from './infrastructure/config/load-env';

async function bootstrap() {
  loadEnvFile();

  const config = getBackendRuntimeConfig();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: config.corsOrigin,
  });
  await app.listen(config.port, config.host);
}

void bootstrap();
