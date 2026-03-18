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

  const requestedPort = process.env.PORT ? Number(process.env.PORT) : 3000;
  const port =
    Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3000;

  await app.listen(port, '0.0.0.0');

  console.log(`Server running on port ${port}`);
}

void bootstrap();
