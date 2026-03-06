import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const emptyQuerySchema = z.object({}).strict();

export function registerListMyBookingsRoute(router: Router): void {
  router.get('/me', validate({ query: emptyQuerySchema }), async (req, res) => {
    const userId = getAuthUserId(req);

    try {
      const bookings = await prisma.booking.findMany({
        where: { userId },
        include: {
          unit: true,
          costSheet: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json(bookings);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientInitializationError) {
        res.status(503).json({
          code: 'DATABASE_UNAVAILABLE',
          message: 'Bookings service is temporarily unavailable. Please try again in a moment.'
        });
        return;
      }

      res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to load bookings right now.'
      });
    }
  });
}
