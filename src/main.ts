import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { initSwagger } from './swagger';

async function bootstrap() {
  const logger = new Logger(bootstrap.name);
  const app = await NestFactory.create(AppModule);

  // Config
  const configs = app.get(ConfigService);

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

  // Swagger
  initSwagger(app);

  // Port listener
  const port = configs.get('PORT') ?? 3000;
  await app.listen(port, () => {
    logger.log(`Application running on port ${port}`);
  });
}
bootstrap();
