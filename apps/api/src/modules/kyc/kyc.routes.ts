import { Router } from 'express';
import { registerGetKycRoute } from './routes/get-kyc.get';
import { registerUpsertKycRoute } from './routes/upsert-kyc.put';

const router = Router();

registerUpsertKycRoute(router);
registerGetKycRoute(router);

export const kycRouter = router;
