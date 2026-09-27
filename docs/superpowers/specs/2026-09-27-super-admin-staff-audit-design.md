# Super admin, staff admins, and audit log

## Goal
Keep one seeded **super admin**, allow that person to create/disable worker **admin** accounts (email invite with temporary password), and let the super admin review an activity log of admin actions.

## Roles

| Role | Access |
|------|--------|
| `super_admin` | Full admin + staff management + audit log |
| `admin` | All current admin workspace actions except staff + audit |
| `client` | Partner portal (unchanged) |

- Seed creates/updates the account as `super_admin` with `status: approved`.
- UI never creates another `super_admin`.
- `requireAdmin` accepts `admin` and `super_admin`.
- `requireSuperAdmin` accepts only `super_admin`.

## Staff lifecycle

- Super admin form: first name, surname, email (phone optional with a safe default).
- Creates `role: admin`, `status: approved`, temporary password emailed (same pattern as partner approval).
- Soft disable: `status: disabled` — login blocked; account and audit history kept.
- Re-enable: set back to `approved`.
- Account statuses enum: `pending | approved | rejected | disabled`.

## Audit log

- Collection `AdminAuditLog`: actor (id, email, role), action key, target type/id, human summary, optional metadata, timestamp.
- Logged for: partner approve/reject, invoice approve/reject, gift CRUD/hide/restore, ad CRUD/hide/restore, redemption status changes, staff create/disable/enable.
- Super-admin-only API + page: paginated list, newest first, filter by actor optional (v1: list all).

## UI

- Admin nav (super admin only): **Équipe** (`/admin/equipe`), **Journal** (`/admin/journal`).
- Regular admins do not see those links; API still enforces 403.
- Login / route guards treat `super_admin` like `admin` for entering `/admin`.

## Out of scope (v1)

- Multiple super admins from UI
- Permission matrix beyond staff + audit exclusivity
- Hard delete of staff
