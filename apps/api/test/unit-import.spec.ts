import { UnitStatus } from '@prisma/client';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {
  mapWorkbookRowsToUnits,
  parseUnitsJson,
  parseSharedStrings,
  parseWorksheetRows,
  replaceUnits
} from '../src/modules/units/unit-import';

describe('unit import workbook parsing', () => {
  it('maps valid workbook rows into units and skips invalid rows', () => {
    const sharedStringsXml = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <si><t>Tower</t></si>
        <si><t>Unit No </t></si>
        <si><t>B Area</t></si>
        <si><t>SV incldg CP</t></si>
        <si><t>T1</t></si>
        <si><t>10001</t></si>
        <si><t>10002</t></si>
      </sst>
    `;

    const sheetXml = `
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheetData>
          <row r="1">
            <c r="A1" t="s"><v>0</v></c>
            <c r="B1" t="s"><v>1</v></c>
            <c r="C1" t="s"><v>2</v></c>
            <c r="D1" t="s"><v>3</v></c>
          </row>
          <row r="2">
            <c r="A2" t="s"><v>4</v></c>
            <c r="B2" t="s"><v>5</v></c>
            <c r="C2"><v>3036</v></c>
            <c r="D2"><v>26247000</v></c>
          </row>
          <row r="3">
            <c r="A3" t="s"><v>4</v></c>
            <c r="B3" t="s"><v>6</v></c>
            <c r="C3"><v>2,091</v></c>
            <c r="D3"><v>17737100</v></c>
          </row>
          <row r="4">
            <c r="A4" t="s"><v>4</v></c>
            <c r="C4"><v>1400</v></c>
            <c r="D4"><v>15000000</v></c>
          </row>
          <row r="5">
            <c r="A5" t="s"><v>4</v></c>
            <c r="B5" t="inlineStr"><is><t> 10004 </t></is></c>
            <c r="C5"><v>oops</v></c>
            <c r="D5"><v>16000000</v></c>
          </row>
        </sheetData>
      </worksheet>
    `;

    const sharedStrings = parseSharedStrings(sharedStringsXml);
    const rows = parseWorksheetRows(sheetXml, sharedStrings);
    const parsed = mapWorkbookRowsToUnits(rows);

    expect(parsed.scannedRows).toBe(4);
    expect(parsed.skippedRows).toBe(2);
    expect(parsed.units).toEqual([
      {
        tower: 'T1',
        unitNumber: '10001',
        areaSqft: 3036,
        price: 26247000,
        status: UnitStatus.AVAILABLE
      },
      {
        tower: 'T1',
        unitNumber: '10002',
        areaSqft: 2091,
        price: 17737100,
        status: UnitStatus.AVAILABLE
      }
    ]);
  });
});

describe('unit import JSON parsing', () => {
  it('loads valid unit rows from a JSON artifact and skips invalid rows', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unit-import-json-'));
    const jsonPath = path.join(tempDir, 'units.seed.json');

    try {
      await fs.writeFile(
        jsonPath,
        JSON.stringify([
          { tower: 'T1', unitNumber: '10001', areaSqft: 3036, price: 26247000 },
          { tower: 'T2', unitNumber: '20001', areaSqft: 2091.2, price: 17737100.4, status: 'BOOKED' },
          { tower: 'T3', unitNumber: 30001, areaSqft: 1500, price: 10000000 }
        ]),
        'utf8'
      );

      const parsed = await parseUnitsJson(jsonPath);

      expect(parsed.scannedRows).toBe(3);
      expect(parsed.skippedRows).toBe(1);
      expect(parsed.units).toEqual([
        {
          tower: 'T1',
          unitNumber: '10001',
          areaSqft: 3036,
          price: 26247000,
          status: UnitStatus.AVAILABLE
        },
        {
          tower: 'T2',
          unitNumber: '20001',
          areaSqft: 2091,
          price: 17737100,
          status: UnitStatus.AVAILABLE
        }
      ]);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('replaceUnits', () => {
  it('clears dependent records before replacing units', async () => {
    const calls: string[] = [];
    const prisma = {
      costSheet: {
        deleteMany: async () => {
          calls.push('costSheet.deleteMany');
          return { count: 3 };
        }
      },
      booking: {
        deleteMany: async () => {
          calls.push('booking.deleteMany');
          return { count: 4 };
        }
      },
      unit: {
        deleteMany: async () => {
          calls.push('unit.deleteMany');
          return { count: 5 };
        },
        createMany: async ({ data }: { data: unknown[] }) => {
          calls.push('unit.createMany');
          return { count: data.length };
        }
      },
      $transaction: async <T>(fn: (tx: any) => Promise<T>) => fn(prisma)
    };

    const result = await replaceUnits(prisma, [
      {
        tower: 'T1',
        unitNumber: '10001',
        areaSqft: 3036,
        price: 26247000,
        status: UnitStatus.AVAILABLE
      }
    ]);

    expect(calls).toEqual([
      'costSheet.deleteMany',
      'booking.deleteMany',
      'unit.deleteMany',
      'unit.createMany'
    ]);
    expect(result).toEqual({
      deletedCostSheets: 3,
      deletedBookings: 4,
      deletedUnits: 5,
      insertedUnits: 1
    });
  });

  it('does not call createMany when there are no imported units', async () => {
    const calls: string[] = [];
    const prisma = {
      costSheet: {
        deleteMany: async () => {
          calls.push('costSheet.deleteMany');
          return { count: 0 };
        }
      },
      booking: {
        deleteMany: async () => {
          calls.push('booking.deleteMany');
          return { count: 0 };
        }
      },
      unit: {
        deleteMany: async () => {
          calls.push('unit.deleteMany');
          return { count: 2 };
        },
        createMany: async ({ data }: { data: unknown[] }) => {
          calls.push(`unit.createMany:${data.length}`);
          return { count: data.length };
        }
      },
      $transaction: async <T>(fn: (tx: any) => Promise<T>) => fn(prisma)
    };

    const result = await replaceUnits(prisma, []);

    expect(calls).toEqual(['costSheet.deleteMany', 'booking.deleteMany', 'unit.deleteMany']);
    expect(result.insertedUnits).toBe(0);
  });
});
