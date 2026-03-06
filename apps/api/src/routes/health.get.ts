import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const emptyQuerySchema = z.object({}).strict();

export function registerHealthGetRoute(router: Router): void {
  router.get('/health', validate({ query: emptyQuerySchema }), (_req, res) => {
    res.json({ status: 'ok' });
  });
}
