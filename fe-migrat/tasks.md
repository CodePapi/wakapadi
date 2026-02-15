# Tours Page Migration & Production Checklist

## Goal
Make the `Tours` page in `fe-migrat` production-ready, responsive, accessible, and faithful to legacy behaviour.

## Legacy behaviour (from `frontend/pages/tours/index.tsx`)
- Fetch all tours from `GET /tours` and render them.
- Search box (city/title) with suggestion list of unique `locationsList`.
- Debounced search (400ms) and immediate update of suggestion input.
- Pagination (PER_PAGE = 12) with page windowing, first/prev/next/last controls.
- Announce visible range via an `aria-live` polite region for screen readers.
- Skeleton cards while loading.
- Error UI with retry button.
- Geolocation-based reverse lookup + POST `/scraper/new/city` (non-blocking) to fetch more tours for current city.
- Unique source list derived from tour `sourceUrl`/`externalPageUrl` for source filtering.
- Recurring-only toggle filter.
- Tour cards link to tour detail pages (`/tours/[city]/[slug]`).
- Smooth scroll-to-top when changing pages (desktop only).

## Desired improvements / production considerations
- Responsive grid: 1/2/3 columns depending on viewport, with proper card sizes and image aspect-ratio.
- Lazy-load tour images, use low-quality placeholders if available.
- Accessibility: keyboard focus states, ARIA labels, role/list semantics, screen-reader announcements for pagination and errors.
- Performance: avoid re-fetch loops, use `cache: 'no-store'` appropriately, consider incremental static generation for SEO-critical pages.
- SEO: set page title/description, OpenGraph tags, canonical links.
- UX polish: nicer skeletons, empty state CTAs, accessible pagination controls, clear filter controls with labels and resets.
- i18n: use `useTranslation()` for all strings and ensure locale keys exist.
- Tests: add unit tests for filtering logic and an integration checklist for manual QA.
- Analytics: track filter uses and clicks to CTAs.

## Implementation checklist
- [ ] Add translations keys for `tours` strings if missing.
- [ ] Implement consistent `PER_PAGE` (12) and pagination UI with keyboard support.
- [ ] Add `aria-live` page announcements when page/filter changes.
- [ ] Improve `CitySearch` UX and ensure suggestions match legacy behaviour.
- [ ] Implement source filter UI, recurring-only toggle, and Clear Filters action.
- [ ] Improve skeleton cards and lazy-load images.
- [ ] Add error handling UI and retry behavior identical to legacy.
- [ ] Add SEO meta tags to `Tours` route.
- [ ] Ensure geolocation scrape flow remains non-blocking and preserves `lastScrapedCity` localStorage logic.
- [ ] Add basic unit tests for `filtered` behavior.
- [ ] Manual QA steps: desktop + mobile verification, keyboard-only navigation, screen-reader check.

## Acceptance Criteria
- Visiting `/tours` shows a responsive, performant list of tours with search, filters, and pagination.
- Users can search and filter; pagination updates announcements for screen readers.
- On low-network or during fetch, skeletons appear. Errors show an actionable retry.
- After login/logout, tours page behaviour remains consistent.


