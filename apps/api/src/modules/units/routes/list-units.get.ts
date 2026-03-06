import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const querySchema = z.object({
  status: z.enum(['AVAILABLE', 'RESERVED', 'BOOKED']).optional()
});

export function registerListUnitsRoute(router: Router): void {
  router.get('/', validate({ query: querySchema }), async (req, res) => {
    const { status } = querySchema.parse(req.query);

    const units = await prisma.unit.findMany({
      where: {
        ...(status ? { status } : {})
      },
      orderBy: [{ tower: 'asc' }, { unitNumber: 'asc' }]
    });

    res.json(units);
  });
}
