import { Router } from 'express';
import { z } from 'zod';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const updateMeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().nullable().optional(),
  address: z.string().min(3).nullable().optional()
});

export function registerUpdateMeRoute(router: Router): void {
  router.put('/me', validate({ body: updateMeSchema }), async (req, res) => {
    const userId = getAuthUserId(req);
    const { name, email, address } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email: email ?? null,
        address: address ?? null
      }
    });

    res.json(user);
  });
}
