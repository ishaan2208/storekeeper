-- AlterEnum
-- Add RECEIVE_IN to the beginning of MovementType enum
ALTER TYPE "MovementType" ADD VALUE 'RECEIVE_IN';

-- AlterEnum
-- Add RECEIVE to the beginning of SlipType enum
ALTER TYPE "SlipType" ADD VALUE 'RECEIVE';

-- AlterTable
-- Add vendorId column to Slip table for receive slips
ALTER TABLE "Slip" ADD COLUMN "vendorId" TEXT;

-- AddForeignKey
-- Link Slip to Vendor
ALTER TABLE "Slip" ADD CONSTRAINT "Slip_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
