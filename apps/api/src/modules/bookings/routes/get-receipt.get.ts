import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../../lib/errors';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';
import { buildReceiptPdf } from '../receipt-pdf';

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

    const pdf = buildReceiptPdf({
      bookingId: booking.id,
      customerName: booking.user.name,
      customerPhone: booking.user.phone,
      unitLabel: `${booking.unit.tower} - ${booking.unit.unitNumber}`,
      bookingAmount: booking.bookingAmount,
      bookingStatus: booking.bookingStatus,
      paymentRef: booking.paymentRef,
      costSheetTotal: booking.costSheet?.total,
      generatedAt: new Date().toISOString()
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${booking.id}.pdf"`);
    res.send(pdf);
  });
}
