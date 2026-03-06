import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../../config/env';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { validate } from '../../../middleware/validate';
import { documentsCloudinary, shortId } from '../cloudinary-client';

const uploadUrlSchema = z.object({
  type: z.enum(['PAN', 'AADHAAR']),
  mimeType: z.string().min(3),
  fileName: z.string().min(1)
});

export function registerUploadUrlRoute(router: Router): void {
  router.post('/upload-url', validate({ body: uploadUrlSchema }), async (req, res) => {
    const userId = getAuthUserId(req);
    const { type, mimeType } = req.body;
    const now = Math.floor(Date.now() / 1000);
    const publicId = `${env.CLOUDINARY_FOLDER}/${userId}/${type.toLowerCase()}-${shortId(10)}`;

    const paramsToSign = {
      timestamp: now,
      public_id: publicId,
      folder: env.CLOUDINARY_FOLDER
    };

    const signature = documentsCloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`;

    res.json({
      uploadUrl,
      publicUrl: `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/raw/upload/${publicId}`,
      assetId: publicId,
      signature,
      apiKey: env.CLOUDINARY_API_KEY,
      timestamp: now,
      mimeType
    });
  });
}
