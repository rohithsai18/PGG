import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../../lib/errors';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const confirmSchema = z.object({
  type: z.enum(['PAN', 'AADHAAR']),
  publicUrl: z.string().url(),
  assetId: z.string().min(4)
});

export function registerConfirmUploadRoute(router: Router): void {
  router.post('/confirm', validate({ body: confirmSchema }), async (req, res) => {
    const userId = getAuthUserId(req);
    const { type, publicUrl } = req.body;

    const existing = await prisma.kycDocument.findUnique({ where: { userId } });
    if (!existing) {
      throw new AppError(400, 'KYC_NOT_FOUND', 'Complete KYC details before uploading documents');
    }

    const updated = await prisma.kycDocument.update({
      where: { userId },
      data: type === 'PAN' ? { panFileUrl: publicUrl } : { aadhaarFileUrl: publicUrl }
    });

    res.json({
      id: updated.id,
      panFileUrl: updated.panFileUrl,
      aadhaarFileUrl: updated.aadhaarFileUrl
    });
  });
}
