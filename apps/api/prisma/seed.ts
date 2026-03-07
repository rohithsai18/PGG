import { PrismaClient } from '@prisma/client';
import { DEFAULT_UNIT_JSON_PATH, importUnitsFromSource, resolveImportSourcePath } from '../src/modules/units/unit-import';

const prisma = new PrismaClient();

async function main() {
  const user1 = await prisma.user.upsert({
    where: { phone: '9999900001' },
    update: {
      name: 'Demo User One',
      email: 'demo1@example.com',
      address: 'Downtown Residence, City'
    },
    create: {
      phone: '9999900001',
      name: 'Demo User One',
      email: 'demo1@example.com',
      address: 'Downtown Residence, City'
    }
  });

  await prisma.user.upsert({
    where: { phone: '9999900002' },
    update: {
      name: 'Demo User Two',
      email: 'demo2@example.com',
      address: 'Sunrise Apartments, City'
    },
    create: {
      phone: '9999900002',
      name: 'Demo User Two',
      email: 'demo2@example.com',
      address: 'Sunrise Apartments, City'
    }
  });

  const workbookPath = await resolveImportSourcePath(process.env.UNIT_IMPORT_SOURCE_PATH ?? DEFAULT_UNIT_JSON_PATH);

  if (workbookPath) {
    await importUnitsFromSource(prisma as any, workbookPath);
  } else {
    // eslint-disable-next-line no-console
    console.warn('[unit-import] source file not found, skipping unit reseed');
  }

  await prisma.kycDocument.upsert({
    where: { userId: user1.id },
    update: {
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123412341234'
    },
    create: {
      userId: user1.id,
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123412341234'
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
