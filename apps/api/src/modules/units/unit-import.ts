import { UnitStatus } from '@prisma/client';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const DEFAULT_UNIT_WORKBOOK_PATH =
  process.env.UNIT_IMPORT_XLSX_PATH ?? 'C:\\Users\\USER\\Desktop\\avl_Units_TPSH.xlsx';
export const DEFAULT_UNIT_JSON_PATH = path.resolve(process.cwd(), 'prisma', 'data', 'units.seed.json');

type Logger = Pick<Console, 'info' | 'warn'>;

type PrismaLike = {
  costSheet: { deleteMany(args?: object): Promise<{ count: number }> };
  booking: { deleteMany(args?: object): Promise<{ count: number }> };
  unit: {
    deleteMany(args?: object): Promise<{ count: number }>;
    createMany(args: { data: ImportedUnit[] }): Promise<{ count: number }>;
  };
  $transaction<T>(fn: (tx: PrismaLike) => Promise<T>): Promise<T>;
};

export type WorksheetValue = string | null;
export type WorksheetRow = WorksheetValue[];

export interface ImportedUnit {
  tower: string;
  unitNumber: string;
  areaSqft: number;
  price: number;
  status: UnitStatus;
}

export interface ParsedWorkbook {
  scannedRows: number;
  skippedRows: number;
  units: ImportedUnit[];
}

export interface ImportSummary extends ParsedWorkbook {
  deletedCostSheets: number;
  deletedBookings: number;
  deletedUnits: number;
  insertedUnits: number;
  workbookPath: string;
}

type SourceSummary = {
  sourcePath: string;
} & ParsedWorkbook;

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseAttributes(fragment: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of fragment.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) {
    attrs[match[1]] = decodeXmlEntities(match[2]);
  }
  return attrs;
}

export function parseSharedStrings(sharedStringsXml: string): string[] {
  const strings: string[] = [];

  for (const match of sharedStringsXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const value = Array.from(match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g))
      .map((item) => decodeXmlEntities(item[1]))
      .join('');
    strings.push(value);
  }

  return strings;
}

function columnLabelToIndex(label: string): number {
  let index = 0;
  for (const char of label.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
}

export function parseWorksheetRows(sheetXml: string, sharedStrings: string[]): WorksheetRow[] {
  const rows: WorksheetRow[] = [];

  for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cellValues = new Map<number, WorksheetValue>();
    let highestIndex = -1;

    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g)) {
      const attributes = parseAttributes(cellMatch[1] ?? cellMatch[3] ?? '');
      const ref = attributes.r ?? '';
      const colLabel = ref.match(/[A-Z]+/)?.[0];
      if (!colLabel) {
        continue;
      }

      const index = columnLabelToIndex(colLabel);
      highestIndex = Math.max(highestIndex, index);
      const cellBody = cellMatch[2] ?? '';
      let value: WorksheetValue = null;

      if (attributes.t === 's') {
        const sharedIndex = cellBody.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (sharedIndex !== undefined) {
          value = sharedStrings[Number(sharedIndex)] ?? null;
        }
      } else if (attributes.t === 'inlineStr') {
        value = Array.from(cellBody.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g))
          .map((item) => decodeXmlEntities(item[1]))
          .join('');
      } else {
        const rawValue = cellBody.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        value = rawValue !== undefined ? decodeXmlEntities(rawValue) : null;
      }

      cellValues.set(index, value);
    }

    if (highestIndex >= 0) {
      const row: WorksheetRow = Array.from({ length: highestIndex + 1 }, (_, idx) => cellValues.get(idx) ?? null);
      rows.push(row);
    }
  }

  return rows;
}

function normalizeHeader(value: WorksheetValue): string {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

function parseRequiredInt(value: WorksheetValue): number | null {
  if (value === null) {
    return null;
  }

  const normalized = value.toString().replace(/,/g, '').trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed);
}

function parseRequiredString(value: WorksheetValue): string | null {
  const normalized = (value ?? '').trim();
  return normalized ? normalized : null;
}

export function mapWorkbookRowsToUnits(rows: WorksheetRow[]): ParsedWorkbook {
  if (rows.length === 0) {
    return { scannedRows: 0, skippedRows: 0, units: [] };
  }

  const header = rows[0].map(normalizeHeader);
  const headerIndex = new Map(header.map((name, idx) => [name, idx]));
  const units: ImportedUnit[] = [];
  let skippedRows = 0;

  for (const row of rows.slice(1)) {
    const tower = parseRequiredString(row[headerIndex.get('Tower') ?? -1] ?? null);
    const unitNumber = parseRequiredString(row[headerIndex.get('Unit No') ?? -1] ?? null);

    if (!tower || !unitNumber) {
      skippedRows += 1;
      continue;
    }

    const areaSqft = parseRequiredInt(row[headerIndex.get('B Area') ?? -1] ?? null);
    const price = parseRequiredInt(row[headerIndex.get('SV incldg CP') ?? -1] ?? null);

    if (areaSqft === null || price === null) {
      skippedRows += 1;
      continue;
    }

    units.push({
      tower,
      unitNumber,
      areaSqft,
      price,
      status: UnitStatus.AVAILABLE
    });
  }

  return {
    scannedRows: Math.max(rows.length - 1, 0),
    skippedRows,
    units
  };
}

async function expandWorkbookToTempDir(workbookPath: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unit-import-'));
  const command = `Expand-Archive -LiteralPath '${workbookPath.replace(/'/g, "''")}' -DestinationPath '${tempDir.replace(/'/g, "''")}' -Force`;

  try {
    await execFileAsync('powershell', ['-NoProfile', '-Command', command]);
    return tempDir;
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

async function loadWorkbookRows(workbookPath: string): Promise<WorksheetRow[]> {
  if (process.platform !== 'win32') {
    throw new Error('Workbook import currently supports Windows environments only.');
  }

  const extractedDir = await expandWorkbookToTempDir(workbookPath);

  try {
    const sharedStringsPath = path.join(extractedDir, 'xl', 'sharedStrings.xml');
    const sheetPath = path.join(extractedDir, 'xl', 'worksheets', 'sheet1.xml');
    const sharedStringsXml = await fs.readFile(sharedStringsPath, 'utf8');
    const sheetXml = await fs.readFile(sheetPath, 'utf8');
    const sharedStrings = parseSharedStrings(sharedStringsXml);
    return parseWorksheetRows(sheetXml, sharedStrings);
  } finally {
    await fs.rm(extractedDir, { recursive: true, force: true });
  }
}

export async function parseUnitsWorkbook(workbookPath: string): Promise<ParsedWorkbook> {
  const rows = await loadWorkbookRows(workbookPath);
  return mapWorkbookRowsToUnits(rows);
}

export async function parseUnitsJson(jsonPath: string): Promise<ParsedWorkbook> {
  const file = await fs.readFile(jsonPath, 'utf8');
  const data = JSON.parse(file) as unknown;

  if (!Array.isArray(data)) {
    throw new Error(`Unit seed JSON must be an array: ${jsonPath}`);
  }

  const units: ImportedUnit[] = [];

  for (const row of data) {
    if (!row || typeof row !== 'object') {
      continue;
    }

    const candidate = row as Partial<ImportedUnit>;
    if (
      typeof candidate.tower !== 'string' ||
      typeof candidate.unitNumber !== 'string' ||
      typeof candidate.areaSqft !== 'number' ||
      typeof candidate.price !== 'number'
    ) {
      continue;
    }

    units.push({
      tower: candidate.tower.trim(),
      unitNumber: candidate.unitNumber.trim(),
      areaSqft: Math.round(candidate.areaSqft),
      price: Math.round(candidate.price),
      status: UnitStatus.AVAILABLE
    });
  }

  return {
    scannedRows: data.length,
    skippedRows: data.length - units.length,
    units
  };
}

export async function parseUnitsSource(sourcePath: string): Promise<SourceSummary> {
  const extension = path.extname(sourcePath).toLowerCase();
  let parsed: ParsedWorkbook;

  if (extension === '.json') {
    parsed = await parseUnitsJson(sourcePath);
  } else if (extension === '.xlsx') {
    parsed = await parseUnitsWorkbook(sourcePath);
  } else {
    throw new Error(`Unsupported unit import source: ${sourcePath}`);
  }

  return {
    sourcePath,
    ...parsed
  };
}

export async function replaceUnits(prisma: PrismaLike, units: ImportedUnit[]): Promise<{
  deletedCostSheets: number;
  deletedBookings: number;
  deletedUnits: number;
  insertedUnits: number;
}> {
  return prisma.$transaction(async (tx) => {
    const deletedCostSheets = await tx.costSheet.deleteMany();
    const deletedBookings = await tx.booking.deleteMany();
    const deletedUnits = await tx.unit.deleteMany();
    const insertedUnits = units.length > 0 ? await tx.unit.createMany({ data: units }) : { count: 0 };

    return {
      deletedCostSheets: deletedCostSheets.count,
      deletedBookings: deletedBookings.count,
      deletedUnits: deletedUnits.count,
      insertedUnits: insertedUnits.count
    };
  });
}

export async function importUnitsFromWorkbook(
  prisma: PrismaLike,
  workbookPath: string,
  logger: Logger = console
): Promise<ImportSummary> {
  const parsed = await parseUnitsWorkbook(workbookPath);
  const replaced = await replaceUnits(prisma, parsed.units);
  const summary: ImportSummary = {
    workbookPath,
    ...parsed,
    ...replaced
  };

  logger.info(
    `[unit-import] scanned=${summary.scannedRows} skipped=${summary.skippedRows} deletedCostSheets=${summary.deletedCostSheets} deletedBookings=${summary.deletedBookings} deletedUnits=${summary.deletedUnits} insertedUnits=${summary.insertedUnits}`
  );

  return summary;
}

export async function importUnitsFromSource(
  prisma: PrismaLike,
  sourcePath: string,
  logger: Logger = console
): Promise<ImportSummary> {
  const parsed = await parseUnitsSource(sourcePath);
  const replaced = await replaceUnits(prisma, parsed.units);
  const summary: ImportSummary = {
    workbookPath: sourcePath,
    scannedRows: parsed.scannedRows,
    skippedRows: parsed.skippedRows,
    units: parsed.units,
    ...replaced
  };

  logger.info(
    `[unit-import] source=${summary.workbookPath} scanned=${summary.scannedRows} skipped=${summary.skippedRows} deletedCostSheets=${summary.deletedCostSheets} deletedBookings=${summary.deletedBookings} deletedUnits=${summary.deletedUnits} insertedUnits=${summary.insertedUnits}`
  );

  return summary;
}

export async function resolveWorkbookPath(candidatePath?: string): Promise<string | null> {
  const workbookPath = candidatePath ?? DEFAULT_UNIT_WORKBOOK_PATH;

  try {
    await fs.access(workbookPath);
    return workbookPath;
  } catch {
    return null;
  }
}

export async function resolveImportSourcePath(candidatePath?: string): Promise<string | null> {
  const sourcePath = candidatePath ?? DEFAULT_UNIT_JSON_PATH;

  try {
    await fs.access(sourcePath);
    return sourcePath;
  } catch {
    return null;
  }
}
