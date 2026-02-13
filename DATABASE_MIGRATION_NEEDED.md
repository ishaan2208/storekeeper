# Database Migration Required

## Issue
The application code expects a `sourceSlipId` column in the `Slip` table that doesn't exist in the current database.

## Error Message
```
The column `Slip.sourceSlipId` does not exist in the current database.
```

## What's Happening
- The Prisma schema defines `sourceSlipId` (schema.prisma line 222)
- A migration file exists to add this column: `20260213182844_phase8_schema_tightening/migration.sql`
- This migration has NOT been applied to the database yet

## Solution
When your database is accessible, run the following command:

```bash
npx prisma migrate deploy
```

This will apply the pending migration that adds:
- `sourceSlipId` column to the `Slip` table (for linking return slips to issue slips)
- Foreign key constraint for the self-referencing relationship
- `Vendor` table and related fields

## Current Database Status
- Database was unreachable when checked
- Connection string: `ep-mute-glitter-a1i6693t-pooler.ap-southeast-1.aws.neon.tech`

## What Was Fixed
✅ **Decimal Serialization Error**: Fixed in all three slip creation pages:
- `/app/slips/new/issue/page.tsx`
- `/app/slips/new/return/page.tsx`
- `/app/slips/new/transfer/page.tsx`

Items with `reorderLevel` (Decimal type) are now properly mapped to only include serializable fields before being passed to Client Components.

## Next Steps
1. Ensure database connection is working
2. Run `npx prisma migrate deploy` to apply pending migrations
3. Restart the dev server if needed
4. Test the `/slips` page and slip creation flows
