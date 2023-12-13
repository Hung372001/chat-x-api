/* eslint-disable @typescript-eslint/no-var-requires */
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { initSwagger } from './swagger';
import * as AWS from 'aws-sdk';
import { RmqService } from './modules/rmq/rmq.service';
import { MicroserviceOptions } from '@nestjs/microservices';
import { EServiceType } from './common/enums/service-type.enum';

async function bootstrap() {
  const logger = new Logger(bootstrap.name);
  const app = await NestFactory.create(AppModule);

  // Config
  const appConfigs = app.get(ConfigService);

  // Cors
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:4000',
      'https://chat-x-black.vercel.app',
      'http://45.32.11.150:3002',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // Interceptors & pipelines
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // AWS S3
  AWS.config.update({
    accessKeyId: appConfigs.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: appConfigs.get('AWS_SECRET_ACCESS_KEY'),
    region: appConfigs.get('AWS_REGION'),
  });

  // Init rabbitMQ microservice
  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice<MicroserviceOptions>(
    rmqService.getOptions(appConfigs.get('RABBITMQ_QUEUE_NAME')),
  );
  app.connectMicroservice<MicroserviceOptions>(
    rmqService.getOptions(appConfigs.get('NOTI_QUEUE_NAME')),
  );

  if (appConfigs.get('SERVICE_TYPE') === EServiceType.SOCKET_GATEWAY) {
    app.connectMicroservice<MicroserviceOptions>(
      rmqService.getOptions(appConfigs.get('CHAT_GATEWAY_QUEUE_NAME')),
    );
  }

  // Swagger
  initSwagger(app);
  await app.startAllMicroservices();

  // Port listener
  const port = appConfigs.get('PORT') ?? 3000;
  await app.listen(port, () => {
    logger.log(`Application running on port ${port}`);
  });
}
bootstrap();
