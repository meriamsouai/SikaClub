# Partner ads banner (rotating)

## Goal
Show a rotatable ads rail in the partner area only, editable by admin at any time.

## Content
- Multiple ads: desktop image + mobile image + optional click URL + title/alt + sort order + active flag
- Images stored under `/uploads/ads/`
- Recommended sizes: desktop **800×1000** (4:5), mobile **1200×400** (3:1)

## Placement
- Partner `AppShell` only (after login)
- Desktop: right column from under top bar to bottom
- Mobile: smaller strip under top bar
- Hidden when no active ads

## Admin
- Page `/admin/publicites` (CRUD, upload, hide/restore), nav entry alongside gifts

## API
- `GET /api/ads` (auth) — active ads for partners
- Admin CRUD under `/api/admin/ads` (same patterns as gifts)
