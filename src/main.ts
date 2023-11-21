/* eslint-disable @typescript-eslint/no-var-requires */
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { initSwagger } from './swagger';
import * as AWS from 'aws-sdk';
import { AllExceptionsFilter } from './interceptors/all-exception.filter';
import { RmqService } from './modules/rmq/rmq.service';
import { MicroserviceOptions } from '@nestjs/microservices';
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

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
  app.useGlobalFilters(new AllExceptionsFilter());

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

  // Swagger
  initSwagger(app);
  await app.startAllMicroservices();

  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });
  } else {
    // Port listener
    const port = appConfigs.get('PORT') ?? 3000;

    await app.listen(port, () => {
      logger.log(`Application running on port ${port}`);
    });
  }
}
bootstrap();
