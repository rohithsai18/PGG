import type { CostSheetDTO } from '@real-estate/shared';
import { env } from '../../config/env';

export function computeCostSheet(basePrice: number): CostSheetDTO {
  const gst = Math.round((basePrice * env.CHARGE_GST_PERCENT) / 100);
  const registration = Math.round((basePrice * env.CHARGE_REGISTRATION_PERCENT) / 100);
  const otherCharges = env.CHARGE_OTHER_FIXED;
  const total = basePrice + gst + registration + otherCharges;

  return {
    basePrice,
    gst,
    registration,
    otherCharges,
    total,
    formulaVersion: env.COST_SHEET_FORMULA_VERSION
  };
}
