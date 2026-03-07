import { PrismaClient } from '@prisma/client';
import { DEFAULT_UNIT_JSON_PATH, importUnitsFromSource, resolveImportSourcePath } from './unit-import';

async function main() {
  const prisma = new PrismaClient();

  try {
    const candidatePath = process.argv[2] ?? process.env.UNIT_IMPORT_SOURCE_PATH ?? DEFAULT_UNIT_JSON_PATH;
    const workbookPath = await resolveImportSourcePath(candidatePath);

    if (!workbookPath) {
      throw new Error(`Unit import source not found at: ${candidatePath}`);
    }

    await importUnitsFromSource(prisma as any, workbookPath);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
