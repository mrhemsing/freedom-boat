import { LOCATIONS, type LocationId } from './locations';

export const DEFAULT_HOME_MARINA_ID: LocationId = 'port-moody';
export const HOME_MARINA_STORAGE_KEY = 'fairtide.homeMarina';
export const HOME_MARINA_CHANGE_EVENT = 'fairtide:home-marina-change';

export function normalizeHomeMarinaId(value: string | null | undefined): LocationId {
  return value && LOCATIONS[value] ? value : DEFAULT_HOME_MARINA_ID;
}

export function homeMarinaLabel(id: LocationId) {
  return LOCATIONS[id]?.name ?? LOCATIONS[DEFAULT_HOME_MARINA_ID].name;
}

export function homeMarinaHref(id: LocationId) {
  return `/location/${normalizeHomeMarinaId(id)}`;
}
