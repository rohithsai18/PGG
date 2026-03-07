import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const querySchema = z.object({
  status: z.enum(['AVAILABLE', 'RESERVED', 'BOOKED']).optional(),
  tower: z.string().trim().min(1).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE)
});

export function registerListUnitsRoute(router: Router): void {
  router.get('/', validate({ query: querySchema }), async (req, res) => {
    const { status, tower, search, page, pageSize } = querySchema.parse(req.query);
    const trimmedSearch = search?.trim();
    const where = {
      ...(status ? { status } : {}),
      ...(tower ? { tower } : {}),
      ...(trimmedSearch
        ? {
            OR: [
              { tower: { contains: trimmedSearch, mode: 'insensitive' as const } },
              { unitNumber: { contains: trimmedSearch, mode: 'insensitive' as const } }
            ]
          }
        : {})
    };
    const skip = (page - 1) * pageSize;

    const [units, totalItems, towerRows] = await prisma.$transaction([
      prisma.unit.findMany({
        where,
        orderBy: [{ tower: 'asc' }, { unitNumber: 'asc' }],
        skip,
        take: pageSize
      }),
      prisma.unit.count({ where }),
      prisma.unit.findMany({
        where: {
          ...(status ? { status } : {})
        },
        select: { tower: true },
        distinct: ['tower'],
        orderBy: { tower: 'asc' }
      })
    ]);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    res.json({
      items: units,
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      towers: towerRows.map((row) => row.tower)
    });
  });
}
