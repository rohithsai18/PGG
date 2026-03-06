import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../../lib/errors';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const bookingIdSchema = z.object({ bookingId: z.string().uuid() });

export function registerGetReceiptRoute(router: Router): void {
  router.get('/:bookingId/receipt', validate({ params: bookingIdSchema }), async (req, res) => {
    const userId = getAuthUserId(req);
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        unit: true,
        costSheet: true,
        user: true
      }
    });

    if (!booking || booking.userId !== userId) {
      throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }

    res.json({
      bookingId: booking.id,
      customerName: booking.user.name,
      customerPhone: booking.user.phone,
      unit: booking.unit,
      bookingAmount: booking.bookingAmount,
      bookingStatus: booking.bookingStatus,
      paymentRef: booking.paymentRef,
      costSheet: booking.costSheet,
      generatedAt: new Date().toISOString()
    });
  });
}
