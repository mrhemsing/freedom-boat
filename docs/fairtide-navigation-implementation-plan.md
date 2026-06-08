# Fair Tide Navigation Implementation Plan

This plan translates `docs/fairtide-navigation-requirements.md` into a build sequence. The key principle is to ship structural clarity first, then deepen the overlay/search/trip layers.

## Current-State Gaps

- `/` currently redirects to `/plan-my-trip`, so Home is not yet a real hub.
- Planner header, Browse/SEO header, and location-page header are separate implementations.
- Planner logo still represents "home" but current code has used app-specific targets such as `/location/port-moody`.
- Map right-column detail and Conditions pages are not yet one canonical component everywhere.
- Conditions modal/iframe work improved duplication, but it does not yet implement the MAP-4 overlay-with-real-canonical-URL pattern.
- Browse filters exist, but the broader IA/search/header state is not unified yet.

## Phase 0: Decisions

Make these calls before heavy implementation:

- Confirm local-first persistence for home marina and trip state.
- Confirm MAP-4 overlay with canonical URL as the target pattern.
- Choose canonical entity URL scheme:
  - Marinas with rich club pages: keep `/location/{locationId}` when a location exists.
  - Generic marinas: keep `/marina/{slug-id}`.
  - Launches: keep `/launch/{slug-id}`.
  - Area guides: keep `/area/{slug}`.
- Define whether guest trips need cloud persistence in this phase. Recommendation: no, local + share URL first.

## Phase 1: Global Header and Home Hub

Deliverables:

- Build one shared `GlobalHeader` component.
- Use it on Home, Map, Browse, area, marina, launch, and location pages.
- Logo always links to `/`.
- Header exposes Map and Browse as visible peers.
- Add active surface state.
- Move day selector slot into the shared header for Map and compatible Conditions contexts.
- Replace `/` redirect with a real Home hub that leads with Port Moody for now.

Acceptance:

- `GET /` renders a page, not a redirect.
- Logo from all major pages points to `/`.
- Map and Browse links are visible from all major pages.
- Port Moody conditions remain first-screen content on Home.

## Phase 2: Canonical Conditions Component

Deliverables:

- Extract shared conditions content from `/location/[locationId]`, `/marina/[slug]`, and planner detail into a canonical component.
- Standardize score/rating vocabulary and component labels.
- Add consistent `Add`, `View on map`, and `View in directory` actions.
- Hide circular actions when the component is rendered in an overlay/map context.

Acceptance:

- Same marina content renders through one component in standalone and embedded contexts.
- No duplicated button set or near-identical modal content remains.
- Score label and color language match across Home, Map preview, Browse, and Conditions.

## Phase 3: Map Preview and Canonical Overlay

Deliverables:

- Convert pin click/right-column selection to lightweight preview.
- Add one primary preview action: `View full conditions`.
- Implement MAP-4: full conditions open as overlay while URL becomes the canonical entity URL.
- Preserve map zoom, center, selected day, selected entity, and sheet state behind the overlay.
- Back closes overlay and restores map state.

Acceptance:

- From Map, opening Reed Point full conditions updates the address bar to its canonical URL while map context remains behind it.
- Direct loading the same canonical URL still works as a standalone page.
- Browser back closes overlay instead of jumping to Home.

## Phase 4: Browse URL State and Contextual Map Links

Deliverables:

- Ensure Browse filters update URL.
- Make `View on map` carry entity/filter context into Map.
- Make Browse rows use canonical Conditions links.

Acceptance:

- `/browse?type=marinas` is shareable and restores the filter.
- Browse -> Map focuses the same entity/area.
- Browse -> detail uses the canonical entity URL.

## Phase 5: Trip Layer

Deliverables:

- Persist home marina and current trip in local storage.
- Add global trip indicator/count in header.
- Make Add affordance consistent on Map preview, Browse rows, and Conditions.
- Add shareable trip URL that reconstructs stops, day, vessel, and speed.

Acceptance:

- Anonymous user can build a trip, leave, reload, and resume.
- Shared trip URL reconstructs the itinerary.
- Add/remove behavior looks and reads the same across surfaces.

## Phase 6: Global Search

Deliverables:

- Header search over marinas, launches, areas, and destinations.
- Desktop command palette behavior.
- Context-aware routing: from Map open overlay; elsewhere open standalone canonical page.

Acceptance:

- Search result selection is keyboard accessible.
- Same result routes differently from Map vs. Browse/Home as intended.

## Verification Pattern

For each phase:

- `npx tsc --noEmit`
- `git diff --check`
- `npm run build`
- Route smoke checks for `/`, `/plan-my-trip`, `/browse`, one `/location/...`, one `/marina/...`, one `/launch/...`.
- Headless Chrome/CDP checks for header links, active state, overlay/back behavior, and mobile layout where relevant.
