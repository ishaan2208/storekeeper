# Phase 3 Migration Notes

## Database Migration Required

Phase 3 introduced changes to the Prisma schema that require a database migration.

### Changes Made
1. Extended `EntityType` enum with 4 new values:
   - `PROPERTY`
   - `LOCATION`
   - `CATEGORY`
   - `USER`

### Migration Steps

Run the following commands to apply the schema changes:

```bash
# Generate Prisma Client with updated types
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name phase3_entity_types

# Or if in production
npx prisma migrate deploy
```

### Verification

After migration, verify the changes:

```bash
# Check migration status
npx prisma migrate status

# Inspect database
npx prisma studio
```

### What This Enables

The extended `EntityType` enum allows proper audit trail logging for:
- Property create/update/delete operations
- Location create/update/delete operations
- Category create/update/delete operations
- User create/update/delete operations

All master data operations now write to the `AuditEvent` table with the correct `entityType`, enabling comprehensive audit trails and history tracking.

## Testing After Migration

Once the migration is complete, test the following flows:

1. Create a property → Check AuditEvent table for PROPERTY type record
2. Update a location → Check AuditEvent table for LOCATION type record with old/new values
3. Delete a category → Check AuditEvent table for CATEGORY type record with old value
4. Create a user → Check AuditEvent table for USER type record

## Rollback (If Needed)

If you need to rollback this migration:

```bash
# Revert to previous migration
npx prisma migrate resolve --rolled-back [migration_name]
```

Note: Ensure you have a database backup before running migrations in production.
