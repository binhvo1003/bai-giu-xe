# Parking Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anyone propose a motorcycle parking entrance in the website and let the owner approve it before it appears on the public map.

**Architecture:** Keep the React/MapLibre frontend. Add a Cloudflare Worker API backed by Supabase Postgres and Supabase Auth. The Worker holds the service key; public submissions enter a pending table, admin review runs through an atomic SQL function, and public GeoJSON contains approved rows only.

**Tech Stack:** React, TypeScript, Vite, MapLibre, Hono, Cloudflare Workers, Supabase.

**Spec:** `KE_HOACH_MVP.md` sections “Đóng góp và kiểm chứng” and `PARKING_FINDER_ARCHITECTURE.md` sections “Dữ liệu và xuất bản” and “Đóng góp và quyền truy cập”.

## Global Constraints

- Name and pinned entrance coordinates are the only required guest inputs.
- New wards appear only after their first parking is approved.
- No service key in the browser. Only the configured owner may review.
- Do not publish pending or rejected data. Repeated approval is idempotent.
- Preserve existing search and routing behavior.

## Review Focus

- Missing name or invalid coordinates returns a clear validation error.
- Unauthenticated admin requests cannot read or approve pending data.
- Duplicate approval cannot create duplicate parking rows.
- A rejected contribution does not affect public GeoJSON.
- Failed API requests leave entered form values intact.

---

### Task 1: Data contract and API

**Files:** Create `supabase/migrations/20261119_parking_contributions.sql`, `worker/index.ts`, `worker/validation.ts`, `wrangler.jsonc`; modify `package.json`.

**Interfaces:** `POST /api/v1/contributions`, `GET /api/v1/parking.geojson`, `GET /api/v1/admin/contributions`, `PATCH /api/v1/admin/contributions/:id`.

- [x] Define pending and approved tables, RLS, rate-limit function, and atomic review function.
- [x] Validate request bodies in Worker and enforce owner authentication for admin routes.
- [x] Add tests for validation, approval boundary, and GeoJSON export with mocked Supabase.

### Task 2: Contribution and review UI

**Files:** Create `src/ContributePanel.tsx`, `src/AdminPanel.tsx`, `src/api.ts`; modify `src/App.tsx`, `src/style.css`, `README.md`.

**Interfaces:** Contributor picks a point on the shared map, enters a name, submits, and sees a pending confirmation. Owner signs in and chooses a ward before approving or rejecting.

- [x] Add navigation and shared-map pin selection for contributions.
- [x] Add owner sign-in and pending review panel.
- [x] Load public GeoJSON from the Worker when configured, with static-file fallback for local UI development.
- [x] Run tests, build, and browser checks for mobile form and admin state.
