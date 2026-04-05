/*
  Warnings:

  - The `status` column on the `BankTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `WalletTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EStatementStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "BankTransaction" DROP COLUMN "status",
ADD COLUMN     "status" "EStatementStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "WalletTransaction" DROP COLUMN "status",
ADD COLUMN     "status" "EStatementStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "MutationStatus";

-- CreateIndex
CREATE INDEX "BankTransaction_status_idx" ON "BankTransaction"("status");

-- CreateIndex
CREATE INDEX "WalletTransaction_status_idx" ON "WalletTransaction"("status");
