# SIKA Portail Partenaires

Partner portal for registering SIKA invoices and tracking bonus points, plus an admin workspace for approvals, clients, leaderboard, and gift catalog management.

## Stack

- **Client:** React, TypeScript, Vite, React Router, Tailwind CSS
- **Server:** Express, TypeScript, JWT in httpOnly cookies, Nodemailer, Multer
- **Database:** MongoDB via Mongoose

## Prerequisites

- Node.js 20 or later
- MongoDB running locally on `mongodb://127.0.0.1:27017`, or Docker
- SMTP credentials (required to approve partner accounts)

## Setup

```bash
npm install
```

Copy the environment file if `server/.env` is not already present:

```bash
cp server/.env.example server/.env
```

Fill in JWT secrets and SMTP settings in `server/.env`:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Do not commit `server/.env`.

Start MongoDB, for example:

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

## Seed accounts

```bash
npm run seed
```

Default credentials (from `server/.env`):

| Role | Email | Password |
|------|-------|----------|
| Partner | `partenaire@example.com` | `DemoPartner123!` |
| Admin | `admin@example.com` | `DemoAdmin123!` |

- Partner lands on **Ajouter une facture**
- Admin lands on `/admin` (pending accounts, clients, leaderboard, gifts)

Approving a pending signup generates a password and emails it via SMTP. If SMTP fails, the account stays pending.

## Auth notes

- Passwords are hashed with bcrypt.
- Access token is a short-lived JWT in an httpOnly cookie; refresh tokens are hashed in MongoDB.
- Keep the app and API same-origin in development via the Vite proxy.

## Main areas

- Partner: invoices, points, gifts catalog, profile
- Admin: approve/reject accounts, list clients, leaderboard, manage gifts (including image upload and hide/restore)
