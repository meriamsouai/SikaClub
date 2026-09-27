# SIKA Portail Partenaires

Partner portal for registering SIKA invoices and tracking bonus points, plus an admin workspace for approvals, clients, leaderboard, and gift catalog management.

## Stack

- **Client:** React, TypeScript, Vite, React Router, Tailwind CSS
- **Server:** Express, TypeScript, JWT in httpOnly cookies, Nodemailer, Multer
- **Database:** MongoDB via Mongoose

## Prerequisites

- Node.js 20 or later
- MongoDB (local, Docker, or MongoDB Atlas)
- SMTP credentials (required to approve partner accounts)

## Setup

```bash
npm install
```

Copy the example env file and fill in your own values:

```bash
cp server/.env.example server/.env
```

Required in `server/.env`:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (long random strings)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (only for seeding; use a strong password)

**Never commit `server/.env`.** It is gitignored on purpose.

Optional local MongoDB via Docker:

```bash
docker compose up -d
```

## Run

From the repository root:

```bash
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:5000 (Vite proxies `/api` and `/uploads`)

## Seed admin account

After configuring `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `server/.env`:

```bash
npm run seed
```

This creates (or updates) the admin user from those env values, plus default products/gifts.

- Admin lands on `/admin` (pending accounts, clients, leaderboard, gifts)
- Partners sign up themselves and wait for admin approval

Approving a pending signup generates a password and emails it via SMTP. If SMTP fails, the account stays pending.

## Auth notes

- Passwords are hashed with bcrypt.
- Access token is a short-lived JWT in an httpOnly cookie; refresh tokens are hashed in MongoDB.
- Keep the app and API same-origin in development via the Vite proxy.

## Deploy notes

- Frontend (e.g. Vercel): set `VITE_API_URL` to the API base URL
- Backend (e.g. Render): set the same secrets as `server/.env`, plus `CLIENT_ORIGIN` to the frontend URL and `NODE_ENV=production`
- Do not put real passwords, JWT secrets, or SMTP credentials in this README or in source files

## Main areas

- Partner: invoices, points, gifts catalog, profile
- Admin: approve/reject accounts, list clients, leaderboard, manage gifts and ads (including image upload and hide/restore)
