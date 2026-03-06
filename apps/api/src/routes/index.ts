import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { authRouter } from '../modules/auth/auth.routes';
import { bookingsRouter } from '../modules/bookings/bookings.routes';
import { brochureRouter } from '../modules/brochure/brochure.routes';
import { documentsRouter } from '../modules/documents/documents.routes';
import { kycRouter } from '../modules/kyc/kyc.routes';
import { unitsRouter } from '../modules/units/units.routes';
import { usersRouter } from '../modules/users/users.routes';
import { registerHealthGetRoute } from './health.get';

const router = Router();

registerHealthGetRoute(router);

router.use('/auth', authRouter);
router.use('/brochure', brochureRouter);
router.use(requireAuth);
router.use(usersRouter);
router.use('/kyc', kycRouter);
router.use('/documents', documentsRouter);
router.use('/units', unitsRouter);
router.use('/bookings', bookingsRouter);

export const apiRouter = router;
