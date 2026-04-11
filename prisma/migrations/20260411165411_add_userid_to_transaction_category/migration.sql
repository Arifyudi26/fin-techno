/*
  Warnings:

  - You are about to drop the column `categoryId` on the `BankTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `WalletTransaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,name]` on the table `TransactionCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,code]` on the table `TransactionCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "BankTransaction" DROP CONSTRAINT "BankTransaction_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "WalletTransaction" DROP CONSTRAINT "WalletTransaction_categoryId_fkey";

-- DropIndex
DROP INDEX "TransactionCategory_code_key";

-- DropIndex
DROP INDEX "TransactionCategory_name_key";

-- AlterTable
ALTER TABLE "BankTransaction" DROP COLUMN "categoryId";

-- AlterTable
ALTER TABLE "TransactionCategory" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "WalletTransaction" DROP COLUMN "categoryId";

-- CreateTable
CREATE TABLE "BankTransactionCategory" (
    "transactionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "BankTransactionCategory_pkey" PRIMARY KEY ("transactionId","categoryId")
);

-- CreateTable
CREATE TABLE "WalletTransactionCategory" (
    "transactionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "WalletTransactionCategory_pkey" PRIMARY KEY ("transactionId","categoryId")
);

-- CreateIndex
CREATE INDEX "BankTransactionCategory_transactionId_idx" ON "BankTransactionCategory"("transactionId");

-- CreateIndex
CREATE INDEX "BankTransactionCategory_categoryId_idx" ON "BankTransactionCategory"("categoryId");

-- CreateIndex
CREATE INDEX "WalletTransactionCategory_transactionId_idx" ON "WalletTransactionCategory"("transactionId");

-- CreateIndex
CREATE INDEX "WalletTransactionCategory_categoryId_idx" ON "WalletTransactionCategory"("categoryId");

-- CreateIndex
CREATE INDEX "TransactionCategory_userId_idx" ON "TransactionCategory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCategory_userId_name_key" ON "TransactionCategory"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCategory_userId_code_key" ON "TransactionCategory"("userId", "code");

-- AddForeignKey
ALTER TABLE "TransactionCategory" ADD CONSTRAINT "TransactionCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransactionCategory" ADD CONSTRAINT "BankTransactionCategory_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "BankTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransactionCategory" ADD CONSTRAINT "BankTransactionCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TransactionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransactionCategory" ADD CONSTRAINT "WalletTransactionCategory_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "WalletTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransactionCategory" ADD CONSTRAINT "WalletTransactionCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TransactionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
