import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';

const api_documentation_credentials = {
  name: 'admin',
  pass: 'admin',
};

export const initSwagger = (app: any) => {
  const config = new DocumentBuilder()
    .setTitle('App Chat X')
    .setDescription('App Chat X description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const http_adapter = app.getHttpAdapter();
  http_adapter.use(
    '/api-docs',
    (req: Request, res: Response, next: NextFunction) => {
      function parseAuthHeader(input: string): { name: string; pass: string } {
        const [, encodedPart] = input.split(' ');

        const buff = Buffer.from(encodedPart, 'base64');
        const text = buff.toString('ascii');
        const [name, pass] = text.split(':');

        return { name, pass };
      }

      function unauthorizedResponse(): void {
        if (http_adapter.getType() === 'fastify') {
          res.statusCode = 401;
          res.setHeader('WWW-Authenticate', 'Basic');
        } else {
          res.status(401);
          res.set('WWW-Authenticate', 'Basic');
        }

        next();
      }

      if (!req.headers.authorization) {
        return unauthorizedResponse();
      }

      const credentials = parseAuthHeader(req.headers.authorization);

      if (
        credentials?.name !== api_documentation_credentials.name ||
        credentials?.pass !== api_documentation_credentials.pass
      ) {
        return unauthorizedResponse();
      }

      next();
    },
  );

  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
};
