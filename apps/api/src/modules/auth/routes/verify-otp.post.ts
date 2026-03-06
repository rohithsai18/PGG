import { RequestHandler, Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../../config/env';
import { AppError } from '../../../lib/errors';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(15),
  requestId: z.string().uuid(),
  otp: z.string().min(4).max(8)
});

export function registerVerifyOtpPostRoute(router: Router, otpLimiter: RequestHandler): void {
  router.post('/verify-otp', otpLimiter, validate({ body: verifyOtpSchema }), async (req, res) => {
    const { phone, requestId, otp } = req.body;
    const request = await prisma.otpRequest.findUnique({ where: { id: requestId } });

    if (!request || request.phone !== phone) {
      throw new AppError(400, 'INVALID_OTP_REQUEST', 'OTP request not found');
    }

    if (request.verifiedAt) {
      throw new AppError(400, 'OTP_ALREADY_USED', 'OTP request already verified');
    }

    if (request.expiresAt < new Date()) {
      throw new AppError(400, 'OTP_EXPIRED', 'OTP request has expired');
    }

    if (otp !== request.otp) {
      throw new AppError(400, 'INVALID_OTP', 'Invalid OTP code');
    }

    await prisma.otpRequest.update({
      where: { id: request.id },
      data: { verifiedAt: new Date() }
    });

    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone,
        name: 'Demo User'
      }
    });

    const accessToken = jwt.sign(
      {
        phone: user.phone
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
        subject: user.id
      }
    );

    res.json({
      accessToken,
      user
    });
  });
}
