import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../../lib/errors';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const emptyQuerySchema = z.object({}).strict();

export function registerGetMeRoute(router: Router): void {
  router.get('/me', validate({ query: emptyQuerySchema }), async (req, res) => {
    const userId = getAuthUserId(req);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    res.json(user);
  });
}
