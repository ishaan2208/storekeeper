# Phase 9 Quick Reference — Quality and Enforcement

## Commands

### Run Invariant Tests
```bash
npm run test:invariants
```
Validates business rule enforcement in the codebase.

### Validate Existing Data
```bash
npm run validate:data
```
Checks existing database records against invariants.

### Run Linter
```bash
npm run lint
```
Checks code quality and style.

## Business Invariants

### 1. No Negative Stock
**File**: `lib/actions/slips.ts:97-129`

```typescript
// Validates stock before movement
const nextQty = currentQty.plus(delta);
if (nextQty.isNegative()) {
  throw new Error("Stock cannot go negative for the source location.");
}
```

**Error Message**: "Stock cannot go negative for the source location."

### 2. No Issuing SCRAP/UNDER_MAINTENANCE Assets
**File**: `lib/actions/slips.ts:286-292`

```typescript
if (
  parsed.slipType === SlipType.ISSUE &&
  (asset.condition === Condition.SCRAP ||
    asset.condition === Condition.UNDER_MAINTENANCE)
) {
  throw new Error("Asset cannot be issued in SCRAP or UNDER_MAINTENANCE condition.");
}
```

**Error Message**: "Asset cannot be issued in SCRAP or UNDER_MAINTENANCE condition."

### 3. Audit Event on Every Mutation
**File**: `lib/actions/audit.ts`

All CREATE/UPDATE/DELETE operations call:
```typescript
await writeAuditEvent(tx, {
  entityType: EntityType.SLIP, // or ASSET, ITEM, etc.
  entityId: slip.id,
  action: AuditAction.CREATE, // or UPDATE, DELETE
  oldValue: {...},  // for UPDATE/DELETE
  newValue: {...},  // for CREATE/UPDATE
  createdById: session.id,
});
```

## Audit Coverage

### Operations with Audit Events

| Entity | Create | Update | Delete |
|--------|--------|--------|--------|
| Slip | ✓ | ✓ | - |
| Asset | ✓ | ✓ | ✓ |
| Item | ✓ | ✓ | ✓ |
| User | ✓ | ✓ | ✓ |
| Property | ✓ | ✓ | ✓ |
| Location | ✓ | ✓ | ✓ |
| Category | ✓ | ✓ | ✓ |
| Maintenance Ticket | ✓ | ✓ | - |
| Signature | ✓ | - | - |

Note: Slips and Tickets use soft delete pattern (no hard deletes).

## Test Files

### Jest Test Suite
**File**: `__tests__/invariants.test.ts`

Comprehensive test scenarios:
- Negative stock prevention with actual slip operations
- Asset condition validation during issue
- Audit event generation for all CRUD operations
- Maintenance ticket audit tracking

Run with:
```bash
npm test -- __tests__/invariants.test.ts
```

### Integration Script
**File**: `scripts/test-invariants.ts`

Lightweight validation without Jest:
- Direct database checks
- Simple pass/fail output
- CI/CD friendly

Run with:
```bash
npm run test:invariants
```

### Data Validation Script
**File**: `scripts/validate-existing-data.ts`

Validates existing database records:
- Checks for negative stock balances
- Verifies no invalid asset issues
- Reports audit coverage gaps
- Validates movement log completeness

Run with:
```bash
npm run validate:data
```

## Common Patterns

### Adding a New Mutation

1. **Wrap in transaction**:
```typescript
return prisma.$transaction(async (tx) => {
  // ... mutation logic
});
```

2. **Add validation**:
```typescript
if (someInvariant) {
  throw new Error("Clear error message");
}
```

3. **Perform mutation**:
```typescript
const entity = await tx.entity.create({ data: {...} });
```

4. **Write audit event**:
```typescript
await writeAuditEvent(tx, {
  entityType: EntityType.ENTITY,
  entityId: entity.id,
  action: AuditAction.CREATE,
  newValue: {...},
  createdById: session.id,
});
```

### Checking Audit Coverage

Query audit events for an entity:
```typescript
const auditEvents = await prisma.auditEvent.findMany({
  where: {
    entityType: "SLIP",
    entityId: slipId,
  },
  orderBy: { createdAt: "desc" },
});
```

Get audit summary:
```typescript
const summary = await prisma.auditEvent.groupBy({
  by: ["entityType", "action"],
  _count: { id: true },
});
```

## Error Handling

### Stock Errors
```typescript
try {
  await createSlip(input);
} catch (error) {
  if (error.message.includes("Stock cannot go negative")) {
    // Handle insufficient stock
  }
}
```

### Asset Condition Errors
```typescript
try {
  await createSlip(input);
} catch (error) {
  if (error.message.includes("SCRAP or UNDER_MAINTENANCE")) {
    // Handle invalid asset condition
  }
}
```

## Debugging Tips

### Check Stock Balance
```sql
SELECT 
  i.name as item_name,
  l.name as location_name,
  sb.qtyOnHand
FROM "StockBalance" sb
JOIN "Item" i ON i.id = sb."itemId"
JOIN "Location" l ON l.id = sb."locationId"
WHERE sb."qtyOnHand" < 0;
```

### Find Invalid Asset Issues
```sql
SELECT 
  s."slipNo",
  a."assetTag",
  a.condition,
  sl."conditionAtMove"
FROM "Slip" s
JOIN "SlipLine" sl ON sl."slipId" = s.id
JOIN "Asset" a ON a.id = sl."assetId"
WHERE s."slipType" = 'ISSUE'
  AND (a.condition IN ('SCRAP', 'UNDER_MAINTENANCE')
       OR sl."conditionAtMove" IN ('SCRAP', 'UNDER_MAINTENANCE'));
```

### Audit Coverage Report
```sql
SELECT 
  "entityType",
  action,
  COUNT(*) as count
FROM "AuditEvent"
GROUP BY "entityType", action
ORDER BY "entityType", action;
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Invariant Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run prisma:generate
      - run: npm run test:invariants
      - run: npm run lint
```

### Pre-commit Hook
```bash
#!/bin/sh
npm run lint
npm run test:invariants
```

## Monitoring

### Key Metrics
- Audit event coverage percentage
- Number of failed invariant checks
- Stock discrepancy count
- Invalid asset issue attempts

### Alerts
Set up alerts for:
- Negative stock balances appearing in database
- Slips created without audit events
- Failed invariant test runs

## Related Documentation
- `PHASE9_SUMMARY.md` - Comprehensive phase documentation
- `.cursor/rules/storekeeper-foundation.mdc` - Domain rules
- `prisma/schema.prisma` - Database schema

## Quick Links

**Test Files**:
- `__tests__/invariants.test.ts`
- `scripts/test-invariants.ts`
- `scripts/validate-existing-data.ts`

**Implementation Files**:
- `lib/actions/audit.ts`
- `lib/actions/slips.ts`
- `lib/actions/maintenance.ts`
- `lib/actions/masters/*.ts`

**Schema**:
- `prisma/schema.prisma` (AuditEvent model: line 341)
