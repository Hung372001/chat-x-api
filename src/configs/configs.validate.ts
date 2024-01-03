import * as Joi from '@hapi/joi';

export const configsValidator = Joi.object({
  // DATABASE
  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),

  // REDIS
  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PORT: Joi.number().port().required(),

  // JWT
  JWT_ACCESS_TOKEN_EXPIRATION_TIME: Joi.number().required(),
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: Joi.number().required(),

  // AWS S3
  AWS_ACCESSS_KEY_ID: Joi.string().required(),
  AWS_BUCKET_NAME: Joi.string().required(),
  AWS_REGION: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),

  // RabbitMQ
  RABBITMQ_URI: Joi.string().required(),

  // Roll call
  ACTIVITY_SCORE_PER_ROLL_CALL: Joi.number().required(),
});
