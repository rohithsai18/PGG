import { Router } from 'express';
import { z } from 'zod';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { maskSensitive } from '../../../lib/mask';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const emptyQuerySchema = z.object({}).strict();

export function registerGetKycRoute(router: Router): void {
  router.get('/', validate({ query: emptyQuerySchema }), async (req, res) => {
    const userId = getAuthUserId(req);
    const doc = await prisma.kycDocument.findUnique({ where: { userId } });

    if (!doc) {
      res.json(null);
      return;
    }

    res.json({
      id: doc.id,
      userId: doc.userId,
      panNumber: doc.panNumber,
      aadhaarNumber: doc.aadhaarNumber,
      panNumberMasked: maskSensitive(doc.panNumber),
      aadhaarNumberMasked: maskSensitive(doc.aadhaarNumber),
      panFileUrl: doc.panFileUrl,
      aadhaarFileUrl: doc.aadhaarFileUrl,
      updatedAt: doc.updatedAt
    });
  });
}
