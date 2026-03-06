import { Router } from 'express';
import { registerGetMeRoute } from './routes/get-me.get';
import { registerUpdateMeRoute } from './routes/update-me.put';

const router = Router();

registerGetMeRoute(router);
registerUpdateMeRoute(router);

export const usersRouter = router;
