import { Router } from 'express';
import { registerGetCostSheetRoute } from './routes/get-cost-sheet.get';
import { registerListUnitsRoute } from './routes/list-units.get';

const router = Router();

registerListUnitsRoute(router);
registerGetCostSheetRoute(router);

export const unitsRouter = router;
