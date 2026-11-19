# Map-first UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the parking map fill the available desktop space and give search, results, and details a clear mobile layout.

**Architecture:** Keep the current React search state, GeoJSON parsing, and MapLibre map. Reorganize the page into a fixed-height desktop workspace with a search/results rail and a flexible map; use a stacked layout on mobile. Add accessible selection and dialog behavior while preserving MVP flows.

**Tech Stack:** React 19, TypeScript, Vite, MapLibre, CSS.

**Spec:** `docs/superpowers/specs/2026-11-19-map-first-ui-design.md`

## Global Constraints

- Preserve Vietnamese copy and accents.
- No unapproved parking markers or data in `public/parking.geojson`.
- P markers stay blue; ward options come only from approved parking data.
- No new UI dependencies.

## Review Focus

- Empty public data: map and search remain usable with a clear approved-data message.
- Failed GPS: address and ward remain available.
- Point search with no results: radius grows 1 km around the same point.
- Long place names and parking names: no horizontal overflow at 375 px.
- Detail sheet: keyboard Escape and close restore focus to its opener.

---

### Task 1: Workspace and visual system

**Files:** Modify `src/App.tsx`, `src/style.css`, `index.html`.

**Interfaces:** Keep `Search`, `Parking`, `choosePoint`, `locate`, `lookup`, and `route` behavior. Add semantic classes for header, rail, search, map, result rows, and empty states.

- [x] Reorder JSX into a search/results rail and a map stage; keep map host mounted.
- [x] Add a responsive CSS token system with colors from the spec, desktop full-height workspace, and mobile stack.
- [x] Verify with `npm run build` and inspect 375 px, 768 px, and desktop layouts.

### Task 2: Selection and detail interaction

**Files:** Modify `src/App.tsx`, `src/style.css`.

**Interfaces:** Marker and result row open the same `selected: Parking | null` sheet. The sheet closes by button, backdrop, or Escape and restores focus to the opener.

- [x] Style matching selected marker and result row; add sheet focus handling and route error feedback inside the sheet.
- [x] Preserve missing-photo, price, hours, and origin choice states.
- [x] Run `npm test`, `npm run build`, `git diff --check`, then inspect the mobile sheet.
