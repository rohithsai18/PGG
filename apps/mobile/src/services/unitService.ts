import { CostSheetDTO, ListUnitsQuery, PaginatedUnitsDTO, UnitDTO } from '../types';
import { apiFetch } from '../lib/api';

function buildUnitsQuery(query: ListUnitsQuery) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params.set(key, String(value));
  }

  const qs = params.toString();
  return qs ? `/units?${qs}` : '/units';
}

export async function listAvailableUnits(token: string, query: ListUnitsQuery) {
  return apiFetch<PaginatedUnitsDTO>(buildUnitsQuery(query), {}, token);
}

export async function getUnitCostSheet(token: string, unitId: string) {
  return apiFetch<CostSheetDTO & { unit: UnitDTO }>(`/units/${unitId}/cost-sheet`, {}, token);
}
