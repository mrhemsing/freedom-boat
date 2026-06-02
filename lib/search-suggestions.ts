import { LOCATIONS } from './locations';
import { AREA_HUBS, marinaPath, SEO_LAUNCHES, SEO_MARINAS } from './seo-slugs';

export type SearchSuggestion = {
  href: string;
  label: string;
  meta: string;
  type: 'Area' | 'Destination' | 'Launch' | 'Conditions';
  keywords: string;
};

export const SEARCH_SUGGESTIONS: SearchSuggestion[] = buildSearchSuggestions();

function buildSearchSuggestions() {
  const seen = new Set<string>();
  const suggestions: SearchSuggestion[] = [];

  for (const location of Object.values(LOCATIONS)) {
    pushSuggestion(suggestions, seen, {
      href: `/location/${location.id}`,
      label: location.name,
      meta: location.address ?? 'Conditions',
      type: 'Conditions',
      keywords: `${location.name} ${location.address ?? ''} ${location.marineAreas?.join(' ') ?? ''}`
    });
  }

  for (const marina of SEO_MARINAS) {
    const href = marinaPath(marina);
    pushSuggestion(suggestions, seen, {
      href,
      label: marina.name,
      meta: marina.locationId ? `${marina.area} conditions` : marina.area,
      type: marina.locationId ? 'Conditions' : 'Destination',
      keywords: `${marina.name} ${marina.area} ${marina.address} ${marina.locationId ?? ''}`
    });
  }

  for (const launch of SEO_LAUNCHES) {
    pushSuggestion(suggestions, seen, {
      href: `/launch/${launch.slug}`,
      label: launch.name,
      meta: launch.area,
      type: 'Launch',
      keywords: `${launch.name} ${launch.area} ${launch.type}`
    });
  }

  for (const hub of AREA_HUBS) {
    pushSuggestion(suggestions, seen, {
      href: `/area/${hub.slug}`,
      label: hub.name,
      meta: 'Area guide',
      type: 'Area',
      keywords: `${hub.name} ${hub.description}`
    });
  }

  return suggestions;
}

function pushSuggestion(suggestions: SearchSuggestion[], seen: Set<string>, suggestion: SearchSuggestion) {
  if (seen.has(suggestion.href)) return;
  seen.add(suggestion.href);
  suggestions.push(suggestion);
}
