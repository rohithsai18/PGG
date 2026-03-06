import { describe, expect, it } from 'vitest';
import { computeCostSheet } from '../src/modules/cost-sheet/cost-sheet.service';

describe('computeCostSheet', () => {
  it('calculates full cost breakdown', () => {
    const sheet = computeCostSheet(1000000);

    expect(sheet.basePrice).toBe(1000000);
    expect(sheet.gst).toBeGreaterThan(0);
    expect(sheet.registration).toBeGreaterThan(0);
    expect(sheet.total).toBe(sheet.basePrice + sheet.gst + sheet.registration + sheet.otherCharges);
  });
});
