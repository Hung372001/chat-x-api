/* eslint-disable @typescript-eslint/no-var-requires */
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { initSwagger } from './swagger';
import * as AWS from 'aws-sdk';
import { RmqRegisterInput, RmqService } from './modules/rmq/rmq.service';
import { MicroserviceOptions } from '@nestjs/microservices';
import { EServiceType } from './common/enums/service-type.enum';
import { ERmqPrefetch, ERmqQueueName } from './common/enums/rmq.enum';

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
  const queueConfigs = [];
  switch (appConfigs.get('SERVICE_TYPE')) {
    case EServiceType.SOCKET_GATEWAY:
      queueConfigs.push({
        queueName: ERmqQueueName.CHAT_GATEWAY,
        prefetchCount: ERmqPrefetch.CHAT_GATEWAY,
      });
      break;
    case EServiceType.BACKGROUND_SERVICE:
      queueConfigs.concat([
        {
          queueName: ERmqQueueName.NOTIFICATION,
          prefetchCount: ERmqPrefetch.NOTIFICATION,
        },
      ]);
      break;
    default:
      queueConfigs.push({
        queueName: ERmqQueueName.SYSTEM,
        prefetchCount: ERmqPrefetch.SYSTEM,
      });
      break;
  }

  // Create rmq consumers
  if (queueConfigs?.length) {
    await Promise.all(
      queueConfigs.map(async (config: RmqRegisterInput) => {
        await app.connectMicroservice<MicroserviceOptions>(
          rmqService.getOptions(config),
        );
      }),
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
