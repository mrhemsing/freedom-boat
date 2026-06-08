# Fair Tide Navigation & Information Architecture Requirements

Imported from Matt's June 2, 2026 requirements spec. This is the working source of truth for the navigation, map, browse, canonical detail, and trip-builder restructuring.

## Goal

Resolve navigation confusion between Home, Plan a Trip / Map, and Browse / Directory, remove duplicated marina-detail views, and raise the wayfinding system to a best-in-class marine trip-planning experience.

## Product Model

Fair Tide has three navigable surfaces plus one canonical content entity:

- Home: a personalized hub at `/`.
- Map: the spatial explore surface at `/plan-my-trip`.
- Browse: the directory/catalogue surface at `/browse`.
- Conditions Page: the single canonical page for a marina, destination, or launch.

Trip planning is a cross-cutting layer. It is visible and resumable from every surface, but it is not a fourth top-level navigation peer.

## Success Criteria

- A first-time visitor reaches useful, location-relevant content within one screen.
- A returning user with a saved home marina lands on that marina's conditions immediately.
- Every marina's conditions live at one shareable, crawlable URL.
- Home, Map, Browse, detail, and back/forward movement are predictable in every direction.
- The product remains usable one-handed on a phone at a dock with marginal signal.

## Core Requirements

### 1. Information Architecture

- IA-1: Home, Map, and Browse are global peers.
- IA-2: Conditions are a canonical entity with one URL.
- IA-3: Trip/itinerary state is cross-cutting and available from any surface.
- IA-4: The hierarchy is at most two levels: surface -> Conditions Page.

### 2. Global Navigation

- NAV-1: One persistent global header appears on every page.
- NAV-2: Header order is logo, primary nav, global search, day/condition selector, account/preferences.
- NAV-3: Logo always navigates to Home (`/`), never a marina page.
- NAV-4: Map and Browse are visible, co-equal links.
- NAV-5: Header shows active/current surface state.
- NAV-6: Breadcrumbs are secondary only.
- NAV-7: Mobile keeps Home, Map, Browse, and search one tap away.

### 3. Home

- HOME-1: `/` is a real hub, not an alias/redirect to a leaf page or the map.
- HOME-2: Saved home marina leads the hub content. Owner default is Port Moody.
- HOME-3: Home marina is a preference, not the definition of Home.
- HOME-4: First-time visitors see meaningful content without a blocking setup gate.
- HOME-5: No saved marina fallback order: geolocation/nearest, featured regional state, Map.
- HOME-6: "Set as my home marina" is lightweight and non-blocking.
- HOME-7: Home has equal entry points to Map and Browse, plus saved/recent trip if present.
- HOME-8: Home marina still has its own canonical Conditions URL.

### 4. Map

- MAP-1: Pin click opens a lightweight preview, not full duplicate conditions.
- MAP-2: Preview has one primary full-detail action: "View full conditions."
- MAP-3: Full conditions from Map use the canonical Conditions Page.
- MAP-4: Recommended pattern is an overlay with the canonical URL in the address bar, with map context behind.
- MAP-5: Day/condition selector persists across pins and overlay.
- MAP-6: Map pins and ranked list share the same score/rating/legend vocabulary as the rest of the site.
- MAP-7: Expand map and locate persist; preview is dismissable without losing map state.

### 5. Browse

- DIR-1: Browse is reachable from the global header everywhere.
- DIR-2: Directory items link to canonical pages, not Browse-only detail copies.
- DIR-3: "View on map" carries current context into the Map.
- DIR-4: Filters update the URL and are back-button safe.

### 6. Canonical Conditions Page

- PAGE-1: Each marina/destination has one stable, human-readable URL.
- PAGE-2: This page/component is the single source of truth for detail content.
- PAGE-3: Standalone and map-overlay renderings share content; only surrounding chrome differs.
- PAGE-4: Content includes score/rating, forecast, wind/gust, tide, wave, visibility/fog, advisories, area/address/distance, access, transient moorage, fuel, and launch availability.
- PAGE-5: External actions like Maps/directions belong on canonical pages.
- PAGE-6: "Open in interactive map" is hidden when already in a map overlay.

### 7. Trip Builder

- TRIP-1: "Add" is consistent on Map preview, Conditions Page, and Browse rows.
- TRIP-2: Current trip is visible/resumable from the global header.
- TRIP-3: Saved trip has a shareable deep link.
- TRIP-4: Trip view compares conditions across stops and days using the same scoring vocabulary.

### 8. Search

- SEARCH-1: Global search exists in the header on every surface.
- SEARCH-2: Search result routing respects context: Map opens overlay; other surfaces open the page.
- SEARCH-3: Desktop supports a keyboard-friendly command palette.

### 9. Flow & State

- FLOW-1: From any surface, the other two surfaces are one action away.
- FLOW-2: Conditions pages expose "View on map" and "View in directory."
- FLOW-3: Back/forward works for overlays, filters, selected day, and closing overlay.
- FLOW-4: Returning to Map restores zoom, center, selected day, and last selection.

### 10. Persistence

- PERS-1: Home marina, recent marinas, and current trip persist.
- PERS-2: Anonymous users can set home and build trips locally.
- PERS-3: Account sign-in later migrates local preferences without loss.
- PERS-4: Geolocation is contextual, never a hard gate.

### 11. Responsive, SEO, Accessibility, Polish

- RESP: One-handed mobile use, bottom-sheet map preview, one-tap global navigation, legible touch targets, and resilient core content.
- SEO: Every entity has a crawlable canonical URL; primary detail content is never modal-only; overlays expose canonical URLs; filters/days/trips are shareable.
- A11Y: Keyboard-operable controls, focus management/trapping for overlays, non-color status cues, named controls, and WCAG 2.2 AA.
- POLISH: One visual system, one scoring vocabulary, smooth/reduced-motion-aware transitions, designed empty/loading/error states, and plain-language marine microcopy.

## Open Decisions

1. Account vs. local-only now: recommended local-first, account-ready data model.
2. Overlay with real canonical URL from Map: recommended, but it is the largest architectural call.
3. Canonical URL scheme for marinas, destinations, and launches.
4. Whether guest-built trips need to survive device changes.
