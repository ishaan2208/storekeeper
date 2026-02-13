# Receive Slip (GRN) - Quick Start Guide

## What's New? 🎉

You can now **receive incoming inventory** into your store! This fills the critical gap where items enter the system from vendors, purchases, or donations.

## How to Use

### Step 1: Navigate to Receive Page

**Option A - From Homepage** (Recommended for first use)
```
Home → Click "Receive Items (GRN)" (green card in Daily Operations)
```

**Option B - From Slips Page**
```
Slips → Click "+ Receive (GRN)" (green button)
```

### Step 2: Fill the Form

```
┌─────────────────────────────────────────────┐
│ RECEIVE ITEMS (GRN)                         │
├─────────────────────────────────────────────┤
│                                             │
│ Property:          [Select Property ▼]      │
│ Department:        [Select Department ▼]    │
│ Receiving Location: [Select Location ▼]    │ ← Where items will be stored
│ Vendor (optional):  [Select Vendor ▼]      │ ← If from a vendor/supplier
│ Received By:       [Select User ▼]         │
│                                             │
│ ─── Items ───────────────────────────────  │
│                                             │
│ Line 1:                                     │
│   Item Category:   [Consumable/Equipment]  │
│   Item:           [Select Item ▼]          │
│   Quantity:       [10]                     │ (for consumables)
│   OR Asset Tag:   [Select Asset ▼]        │ (for equipment)
│   Notes:          [Optional]               │
│                                             │
│ [+ Add Line]                                │
│                                             │
│ ─── Sign-Off ────────────────────────────  │
│                                             │
│ Signed By Name:   [Full Name]             │
│ Signed By User:   [Select User ▼]         │
│                                             │
│ [Create RECEIVE Slip]                       │
└─────────────────────────────────────────────┘
```

### Step 3: Result

- ✅ Slip created with RCV prefix (e.g., `RCV-AB12CD-3456`)
- ✅ Stock **increased** at receiving location
- ✅ Movement log created with `RECEIVE_IN` type
- ✅ Vendor linked (if selected)
- ✅ Signature captured

## When to Use Receive Slips

| Scenario | Example |
|----------|---------|
| **Vendor Purchase** | Bought 50 towels from supplier → Receive slip |
| **Initial Stock** | Setting up new property inventory → Receive slip |
| **Donation** | Received donated equipment → Receive slip |
| **External Transfer** | Items from another company/property → Receive slip |

## Key Differences from Other Slips

```
┌──────────────────────────────────────────────────────────┐
│                    SLIP TYPE COMPARISON                  │
├──────────┬──────────────┬─────────────┬─────────────────┤
│          │ From Location│ To Location │ Stock Movement  │
├──────────┼──────────────┼─────────────┼─────────────────┤
│ RECEIVE  │ ❌ Not needed│ ✅ Required │ Only INCREASE   │
│ ISSUE    │ ✅ Required  │ ✅ Required │ From → To       │
│ RETURN   │ ✅ Required  │ ✅ Required │ From → To       │
│ TRANSFER │ ✅ Required  │ ✅ Required │ From → To       │
└──────────┴──────────────┴─────────────┴─────────────────┘
```

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    INVENTORY FLOW                           │
└─────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │   VENDOR /   │
  │   SUPPLIER   │
  └──────┬───────┘
         │
         │ [RECEIVE SLIP] ← NEW!
         ↓
  ┌──────────────┐
  │    STORE     │
  │  (Location)  │
  └──────┬───────┘
         │
         │ [ISSUE SLIP]
         ↓
  ┌──────────────┐
  │  DEPARTMENT  │
  │   (In Use)   │
  └──────┬───────┘
         │
         │ [RETURN SLIP]
         ↓
  ┌──────────────┐
  │    STORE     │
  │  (Location)  │
  └──────────────┘
```

## Example Scenarios

### Scenario 1: Purchasing New Towels
```
1. Vendor delivers 100 towels
2. Create RECEIVE slip:
   - Property: Grand Hotel
   - Receiving Location: Main Store
   - Vendor: ABC Textiles
   - Item: Bath Towel (consumable)
   - Qty: 100
3. Stock increases: Main Store → 100 towels added
```

### Scenario 2: New Equipment Delivery
```
1. New refrigerator delivered
2. Create RECEIVE slip:
   - Property: Beach Resort
   - Receiving Location: Kitchen Store
   - Vendor: CoolTech Appliances
   - Item: Refrigerator (equipment/asset)
   - Asset Tag: FRIDGE-2024-001
3. Asset created at Kitchen Store location
```

## Database Migration

**Important**: When your database is accessible, run:

```bash
npx prisma migrate deploy
```

This will:
- Add `RECEIVE_IN` to MovementType enum
- Add `RECEIVE` to SlipType enum
- Add `vendorId` column to Slip table

## Visual Changes

### Homepage - Daily Operations Section
```
┌────────────────────────────────────────────────┐
│ Daily Operations                               │
├────────────────────────────────────────────────┤
│                                                │
│  ┌─────────────────┐  ┌─────────────────┐    │
│  │ 🟢 Receive Items │  │   Issue Items   │    │
│  │     (GRN)        │  │                 │    │
│  │ ← NEW & GREEN!   │  │                 │    │
│  └─────────────────┘  └─────────────────┘    │
│                                                │
└────────────────────────────────────────────────┘
```

### Slips Page - Action Buttons
```
┌────────────────────────────────────────────────┐
│ [🟢 + Receive (GRN)] [+ Issue] [+ Return] ... │
│  ← NEW & PROMINENT                             │
└────────────────────────────────────────────────┘
```

## Quick Reference

| What | Value |
|------|-------|
| **URL** | `/slips/new/receive` |
| **Slip Prefix** | `RCV-` |
| **Movement Type** | `RECEIVE_IN` |
| **Required Fields** | Property, Dept, To Location, Items, Signature |
| **Optional Fields** | Vendor, Received By |

## Support

For detailed implementation notes, see `RECEIVE_SLIP_IMPLEMENTATION.md`

---

**Ready to receive inventory!** 📦✨
