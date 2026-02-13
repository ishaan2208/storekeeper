-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "specialization" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add sourceSlipId to Slip for return linking
ALTER TABLE "Slip" ADD COLUMN "sourceSlipId" TEXT;

-- AlterTable: Add vendorId to MaintenanceTicket
ALTER TABLE "MaintenanceTicket" ADD COLUMN "vendorId" TEXT;

-- AlterTable: Add foreign key constraint for DamageReport.approvedById
-- (approvedById field already exists, just ensuring the FK constraint is present)
ALTER TABLE "DamageReport" 
ADD CONSTRAINT "DamageReport_approvedById_fkey" 
FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- AddForeignKey
ALTER TABLE "Slip" 
ADD CONSTRAINT "Slip_sourceSlipId_fkey" 
FOREIGN KEY ("sourceSlipId") REFERENCES "Slip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" 
ADD CONSTRAINT "MaintenanceTicket_vendorId_fkey" 
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
