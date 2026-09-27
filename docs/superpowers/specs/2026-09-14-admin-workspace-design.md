# Admin workspace design

Date: 2026-09-14

## Summary

Same React app with role-based shells. Admins land on `/admin` after login. Partners keep the existing portal.

## Features

- Pending account approval / rejection
- On approve: auto-generated password emailed via real SMTP (nodemailer)
- Clients list with details and points
- Points leaderboard
- Gift catalog in MongoDB with create / edit / soft-hide / restore and image upload to server

## Technical notes

- `requireAdmin` middleware on `/api/admin/*`
- Gifts: `active: false` hides from partners
- Uploads stored in `server/uploads/gifts`, served at `/uploads`
- SMTP env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Seed admin via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in local env (never commit real values)
