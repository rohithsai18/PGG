import { RequestHandler, Router } from 'express';
import { z } from 'zod';
import { env } from '../../../config/env';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const requestOtpSchema = z.object({
  phone: z.string().min(8).max(15)
});

export function registerRequestOtpPostRoute(router: Router, otpLimiter: RequestHandler): void {
  router.post('/request-otp', otpLimiter, validate({ body: requestOtpSchema }), async (req, res) => {
    const { phone } = req.body;
    const otp = env.DEMO_OTP_CODE;
    const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

    const otpRequest = await prisma.otpRequest.create({
      data: {
        phone,
        otp,
        expiresAt
      }
    });

    res.status(201).json({
      requestId: otpRequest.id,
      demoOtpHint: env.NODE_ENV === 'production' ? undefined : otp
    });
  });
}
