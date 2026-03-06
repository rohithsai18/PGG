import { Router } from 'express';
import { z } from 'zod';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { maskSensitive } from '../../../lib/mask';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const kycSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(8).max(15),
  email: z.string().email(),
  address: z.string().min(5),
  panNumber: z.string().min(8).max(20),
  aadhaarNumber: z.string().min(12).max(20)
});

export function registerUpsertKycRoute(router: Router): void {
  router.put('/', validate({ body: kycSchema }), async (req, res) => {
    const userId = getAuthUserId(req);
    const { fullName, phone, email, address, panNumber, aadhaarNumber } = req.body;

    const [user, doc] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          name: fullName,
          phone,
          email,
          address
        }
      }),
      prisma.kycDocument.upsert({
        where: { userId },
        update: {
          panNumber,
          aadhaarNumber
        },
        create: {
          userId,
          panNumber,
          aadhaarNumber
        }
      })
    ]);

    res.json({
      user,
      kyc: {
        id: doc.id,
        userId: doc.userId,
        panNumberMasked: maskSensitive(doc.panNumber),
        aadhaarNumberMasked: maskSensitive(doc.aadhaarNumber),
        panFileUrl: doc.panFileUrl,
        aadhaarFileUrl: doc.aadhaarFileUrl,
        updatedAt: doc.updatedAt
      }
    });
  });
}
