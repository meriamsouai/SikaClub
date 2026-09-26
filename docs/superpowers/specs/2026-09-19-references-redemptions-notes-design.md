# References, Gift Redemption & Invoice Notes — Design

**Date:** 2026-09-19  
**Approach:** Extend current models (approved)

## Decisions
- References: `FAC-YYYY-#####`, `CAD-YYYY-#####` (yearly counters)
- Messaging: simple — `adminNote` + `clientProblemReport` (no thread)
- Gift statuses: `en_cours` → `claimed` | `cancelled` (cancel refunds points)

## Data
- **Counter** model for sequential refs
- **Invoice**: add `reference`, `clientProblemReport`
- **GiftRedemption**: user, gift snapshot, pointsSpent, reference, status, timestamps
- **PointEntry**: types `+ redemption` (negative), `redemption_refund` (positive); link `giftRedemption`

## APIs
- Invoice: generate ref on create; PATCH client report; admin reject/approve with note UI
- Gifts: POST redeem; GET mine; admin list + PATCH status
- Points: ledger already `/mine`; admin GET user points

## UI
- Client historique: show FAC ref, admin note, problem report form
- Client cadeaux: redeem button, my redemptions + status
- Admin factures: note on reject; show client report; show refs
- Admin: new redemptions page (status controls)
- Points logs: show redemption / refund entries client + admin
