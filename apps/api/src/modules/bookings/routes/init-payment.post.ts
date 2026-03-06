import { randomUUID } from 'crypto';
import { BookingStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../../lib/errors';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const shortId = (length: number) => randomUUID().replace(/-/g, '').slice(0, length);
const bookingIdSchema = z.object({ bookingId: z.string().uuid() });

export function registerInitPaymentRoute(router: Router): void {
  router.post('/:bookingId/payment/init', validate({ params: bookingIdSchema }), async (req, res) => {
    const userId = getAuthUserId(req);
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.userId !== userId) {
      throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }

    if (booking.bookingStatus !== BookingStatus.PENDING_PAYMENT) {
      throw new AppError(400, 'INVALID_BOOKING_STATE', 'Booking is not awaiting payment');
    }

    const paymentRef = `PAY-${shortId(8).toUpperCase()}`;

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentRef
      }
    });

    res.json({
      paymentRef,
      amount: booking.bookingAmount,
      status: 'INITIATED'
    });
  });
}
