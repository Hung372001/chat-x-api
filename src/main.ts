import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { initSwagger } from './swagger';
import { config } from 'aws-sdk';

async function bootstrap() {
  const logger = new Logger(bootstrap.name);
  const app = await NestFactory.create(AppModule);

  // Config
  const appConfigs = app.get(ConfigService);

  // Cors
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:4000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  // Interceptors & pipelines
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // AWS S3
  config.update({
    accessKeyId: appConfigs.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: appConfigs.get('AWS_SECRET_ACCESS_KEY'),
    region: appConfigs.get('AWS_REGION'),
  });

  // Swagger
  initSwagger(app);

  // Port listener
  const port = appConfigs.get('PORT') ?? 3000;
  await app.listen(port, () => {
    logger.log(`Application running on port ${port}`);
  });
}
bootstrap();
