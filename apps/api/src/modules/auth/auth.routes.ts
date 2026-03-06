import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { registerRequestOtpPostRoute } from './routes/request-otp.post';
import { registerVerifyOtpPostRoute } from './routes/verify-otp.post';

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

registerRequestOtpPostRoute(router, otpLimiter);
registerVerifyOtpPostRoute(router, otpLimiter);

export const authRouter = router;
