import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../../lib/errors';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';
import { computeCostSheet } from '../../cost-sheet/cost-sheet.service';

const unitParamSchema = z.object({
  unitId: z.string().uuid()
});

export function registerGetCostSheetRoute(router: Router): void {
  router.get('/:unitId/cost-sheet', validate({ params: unitParamSchema }), async (req, res) => {
    const { unitId } = req.params;
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });

    if (!unit) {
      throw new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found');
    }

    const costSheet = computeCostSheet(unit.price);
    res.json({
      unit,
      ...costSheet
    });
  });
}
