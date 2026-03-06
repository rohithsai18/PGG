import { Router } from 'express';
import { registerDownloadBrochureRoute } from './routes/download-brochure.get';

const router = Router();

registerDownloadBrochureRoute(router);

export const brochureRouter = router;
