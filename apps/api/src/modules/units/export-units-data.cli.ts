import { promises as fs } from 'fs';
import path from 'path';
import { DEFAULT_UNIT_JSON_PATH, DEFAULT_UNIT_WORKBOOK_PATH, parseUnitsWorkbook } from './unit-import';

async function main() {
  const workbookPath = process.argv[2] ?? process.env.UNIT_IMPORT_XLSX_PATH ?? DEFAULT_UNIT_WORKBOOK_PATH;
  const outputPath = process.argv[3] ?? DEFAULT_UNIT_JSON_PATH;
  const parsed = await parseUnitsWorkbook(workbookPath);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(parsed.units, null, 2)}\n`, 'utf8');

  // eslint-disable-next-line no-console
  console.info(`[unit-import] exported ${parsed.units.length} units to ${outputPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
