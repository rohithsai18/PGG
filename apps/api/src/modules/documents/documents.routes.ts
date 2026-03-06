import { Router } from 'express';
import { registerConfirmUploadRoute } from './routes/confirm-upload.post';
import { registerUploadUrlRoute } from './routes/upload-url.post';

const router = Router();

registerUploadUrlRoute(router);
registerConfirmUploadRoute(router);

export const documentsRouter = router;
