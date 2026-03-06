import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { apiRouter } from './routes';
import { corsOrigins } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/error-handler';

export const app = express();

// Railway forwards the original client IP via X-Forwarded-For.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '5mb' }));
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1', apiRouter);
app.use(errorHandler);
