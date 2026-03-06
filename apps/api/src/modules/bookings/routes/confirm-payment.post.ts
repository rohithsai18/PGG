import { BookingStatus, UnitStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../../lib/errors';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const bookingIdSchema = z.object({ bookingId: z.string().uuid() });
const confirmPaymentSchema = z.object({ paymentRef: z.string().min(6) });

export function registerConfirmPaymentRoute(router: Router): void {
  router.post(
    '/:bookingId/payment/confirm',
    validate({ params: bookingIdSchema, body: confirmPaymentSchema }),
    async (req, res) => {
      const userId = getAuthUserId(req);
      const { bookingId } = req.params;
      const { paymentRef } = req.body;

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking || booking.userId !== userId) {
        throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
      }

      if (booking.bookingStatus !== BookingStatus.PENDING_PAYMENT) {
        throw new AppError(400, 'INVALID_BOOKING_STATE', 'Booking is not in pending payment state');
      }

      if (booking.paymentRef !== paymentRef) {
        throw new AppError(400, 'INVALID_PAYMENT_REF', 'Payment reference does not match');
      }

      const updated = await prisma.$transaction(async (tx) => {
        const confirmed = await tx.booking.update({
          where: { id: booking.id },
          data: { bookingStatus: BookingStatus.CONFIRMED }
        });

        await tx.unit.update({
          where: { id: booking.unitId },
          data: { status: UnitStatus.BOOKED }
        });

        return confirmed;
      });

      res.json({
        booking: updated,
        message: 'Booking confirmed'
      });
    }
  );
}
