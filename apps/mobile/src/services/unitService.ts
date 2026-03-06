import { UnitDTO, CostSheetDTO } from '../types';
import { apiFetch } from '../lib/api';

export async function listAvailableUnits(token: string) {
  return apiFetch<UnitDTO[]>('/units?status=AVAILABLE', {}, token);
}

export async function getUnitCostSheet(token: string, unitId: string) {
  return apiFetch<CostSheetDTO & { unit: UnitDTO }>(`/units/${unitId}/cost-sheet`, {}, token);
}
