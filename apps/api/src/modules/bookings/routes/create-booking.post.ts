import { BookingStatus, UnitStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../../lib/errors';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';
import { computeCostSheet } from '../../cost-sheet/cost-sheet.service';

const createBookingSchema = z.object({
  unitId: z.string().uuid(),
  bookingAmount: z.number().positive()
});

export function registerCreateBookingRoute(router: Router): void {
  router.post('/', validate({ body: createBookingSchema }), async (req, res) => {
    const userId = getAuthUserId(req);
    const { unitId, bookingAmount } = req.body;

    const { booking, costSheet } = await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.findUnique({ where: { id: unitId } });

      if (!unit) {
        throw new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found');
      }

      const reserved = await tx.unit.updateMany({
        where: {
          id: unitId,
          status: UnitStatus.AVAILABLE
        },
        data: { status: UnitStatus.RESERVED }
      });

      if (reserved.count !== 1) {
        throw new AppError(409, 'UNIT_NOT_AVAILABLE', 'Unit is not available for booking');
      }

      const booking = await tx.booking.create({
        data: {
          userId,
          unitId,
          bookingAmount,
          bookingStatus: BookingStatus.PENDING_PAYMENT
        }
      });

      const calculated = computeCostSheet(unit.price);
      const costSheet = await tx.costSheet.create({
        data: {
          bookingId: booking.id,
          ...calculated
        }
      });

      return { booking, costSheet };
    });

    res.status(201).json({
      booking,
      costSheet
    });
  });
}
