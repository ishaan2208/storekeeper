# Storekeeper

Storekeeper is a lightweight internal web app for tracking:

- Assets/equipment (`ASSET`) such as induction units, mixers, PCB boards, tools.
- Consumables/parts (`STOCK`) such as bulbs, extension tops, screws, fuses.

The core idea is movement-first tracking with auditable events for:

- `ISSUE_OUT`, `RETURN_IN`, `TRANSFER`
- `MAINT_OUT`, `MAINT_IN`
- `ADJUSTMENT`, `SCRAP_OUT`

## What is implemented

**Phase 1 (Foundation):**
- Prisma schema with core masters, slips, movement logs, maintenance, damage reports, audit events.
- Prisma seed script with sample property, location, categories, stock item, asset, and maintenance record.
- Shared Prisma client helper in `lib/prisma.ts`.
- Cursor rule in `.cursor/rules/storekeeper-foundation.mdc`.
- Authentication and role-based permissions.

**Phase 2 (Complete Slips Module):**
- Full support for `ISSUE`, `RETURN`, `TRANSFER`, and `MAINT` slip types.
- Optional `sourceSlipId` validation for returns from original issues.
- Centralized audit writes via `lib/actions/audit.ts`.
- Item autocomplete/filter in slip forms.
- Slips list page with filters (type, department, property).
- Transfer slip creation page.
- Enhanced print CSS for proper slip layout.
- Signature capture on all slip types.

**Phase 3-8 (Maintenance, Reports, Masters, and Polish):**
- Complete maintenance ticket lifecycle with status tracking.
- Comprehensive master data management (Properties, Locations, Categories, Items, Assets, Users).
- Movement logs for all inventory operations.
- Full audit event coverage across all mutations.
- Mobile-optimized UI with responsive design.

**Phase 9 (Quality and Enforcement):**
- Invariant validation: No negative stock (except admin adjustment).
- Invariant validation: No issuing SCRAP/UNDER_MAINTENANCE assets.
- Audit event on every mutation (CREATE, UPDATE, DELETE).
- Comprehensive test suite (`__tests__/invariants.test.ts`).
- Integration test script (`scripts/test-invariants.ts`).
- Lint clean pass on all action files.

## Tech stack

- Next.js App Router
- Prisma
- PostgreSQL
- Zod (for action validation in upcoming phases)

## Local setup

1) Install dependencies

```bash
npm install
```

2) Create `.env` with at least:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/storekeeper?schema=public"
STOREKEEPER_AUTH_SECRET="replace-with-a-strong-secret"
STOREKEEPER_LOGIN_CODE="set-a-shared-access-code"
```

3) Generate Prisma client and push/migrate schema

```bash
npm run prisma:generate
npm run prisma:push
# or: npm run prisma:migrate
```

4) Seed sample data

```bash
npm run prisma:seed
```

5) Start app

```bash
npm run dev
```

6) Run invariant tests (optional)

```bash
npm run test:invariants
```

## Next implementation phases

- ~~Phase 1: Foundation (Prisma models + auth-ready user model + masters)~~ ✅
- ~~Phase 2: Slips (Issue + Return + Transfer + Maint) with signature capture~~ ✅
- ~~Phase 3: Maintenance lifecycle actions + logs~~ ✅
- ~~Phase 4: Reports and mandatory audit writes~~ ✅
- ~~Phase 5: Mobile speed polish and advanced features~~ ✅
- ~~Phase 6-8: Master data management and UI enhancements~~ ✅
- ~~Phase 9: Quality and Enforcement (Invariant tests + audit coverage)~~ ✅

## Testing

Run the invariant test suite to validate business rules:

```bash
npm run test:invariants
```

This validates:
- No negative stock movements (except admin adjustments)
- No issuing SCRAP or UNDER_MAINTENANCE assets
- Audit events on all mutations (CREATE, UPDATE, DELETE)
- Movement log creation for all slips

## Data Integrity

The system enforces strict data integrity rules:

1. **Stock Validation**: Stock levels cannot go negative during ISSUE/TRANSFER operations
2. **Asset Condition**: Assets in SCRAP or UNDER_MAINTENANCE condition cannot be issued
3. **Audit Trail**: Every mutation creates an audit event with old/new values
4. **Transaction Safety**: All operations use database transactions for atomicity
5. **Soft Deletes**: Entities with history cannot be hard deleted

See `PHASE9_SUMMARY.md` for detailed documentation.
