import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../../config/env';
import { AppError } from '../../../lib/errors';
import { validate } from '../../../middleware/validate';

const emptyQuerySchema = z.object({}).strict();

export function registerDownloadBrochureRoute(router: Router): void {
  router.get('/', validate({ query: emptyQuerySchema }), (_req, res) => {
    const filePath = path.resolve(process.cwd(), env.BROCHURE_FILE_PATH);
    if (!fs.existsSync(filePath)) {
      throw new AppError(404, 'BROCHURE_NOT_FOUND', 'Brochure file not found');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="project-brochure.pdf"');
    res.sendFile(filePath);
  });
}
