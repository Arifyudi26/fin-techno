-- CreateEnum
CREATE TYPE "BankProvider" AS ENUM ('BCA', 'BNI', 'BRI', 'MANDIRI', 'CIMB', 'PERMATA', 'DANAMON', 'BTN', 'BSI', 'OTHER');

-- CreateEnum
CREATE TYPE "FileFormat" AS ENUM ('CSV', 'XLSX', 'XLS', 'PDF');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "MutationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MergeStatus" AS ENUM ('DRAFT', 'MERGED', 'CONFLICT');

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "bankProvider" "BankProvider" NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementUpload" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileFormat" "FileFormat" NOT NULL,
    "fileSizeBytes" INTEGER,
    "bankProvider" "BankProvider" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'UPLOADING',
    "errorMessage" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "parsedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "totalCredit" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "totalDebit" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatementUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "valueDate" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DECIMAL(20,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "balance" DECIMAL(20,2),
    "status" "MutationStatus" NOT NULL DEFAULT 'PENDING',
    "categoryId" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "note" TEXT,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MergeReport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "MergeStatus" NOT NULL DEFAULT 'DRAFT',
    "totalCredit" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "totalDebit" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "netFlow" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MergeReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MergeReportItem" (
    "id" TEXT NOT NULL,
    "mergeReportId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "resolvedNote" TEXT,

    CONSTRAINT "MergeReportItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_accountNumber_key" ON "BankAccount"("accountNumber");

-- CreateIndex
CREATE INDEX "BankAccount_bankProvider_idx" ON "BankAccount"("bankProvider");

-- CreateIndex
CREATE INDEX "BankAccount_ownerId_idx" ON "BankAccount"("ownerId");

-- CreateIndex
CREATE INDEX "BankStatementUpload_bankAccountId_idx" ON "BankStatementUpload"("bankAccountId");

-- CreateIndex
CREATE INDEX "BankStatementUpload_uploadedById_idx" ON "BankStatementUpload"("uploadedById");

-- CreateIndex
CREATE INDEX "BankStatementUpload_status_idx" ON "BankStatementUpload"("status");

-- CreateIndex
CREATE INDEX "BankStatementUpload_periodStart_periodEnd_idx" ON "BankStatementUpload"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "BankStatementUpload_bankProvider_idx" ON "BankStatementUpload"("bankProvider");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_hash_key" ON "BankTransaction"("hash");

-- CreateIndex
CREATE INDEX "BankTransaction_bankAccountId_idx" ON "BankTransaction"("bankAccountId");

-- CreateIndex
CREATE INDEX "BankTransaction_uploadId_idx" ON "BankTransaction"("uploadId");

-- CreateIndex
CREATE INDEX "BankTransaction_transactionDate_idx" ON "BankTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "BankTransaction_type_idx" ON "BankTransaction"("type");

-- CreateIndex
CREATE INDEX "BankTransaction_status_idx" ON "BankTransaction"("status");

-- CreateIndex
CREATE INDEX "BankTransaction_reference_idx" ON "BankTransaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCategory_name_key" ON "TransactionCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCategory_code_key" ON "TransactionCategory"("code");

-- CreateIndex
CREATE INDEX "MergeReport_status_idx" ON "MergeReport"("status");

-- CreateIndex
CREATE INDEX "MergeReport_periodStart_periodEnd_idx" ON "MergeReport"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "MergeReport_createdById_idx" ON "MergeReport"("createdById");

-- CreateIndex
CREATE INDEX "MergeReportItem_mergeReportId_idx" ON "MergeReportItem"("mergeReportId");

-- CreateIndex
CREATE INDEX "MergeReportItem_isDuplicate_idx" ON "MergeReportItem"("isDuplicate");

-- CreateIndex
CREATE UNIQUE INDEX "MergeReportItem_mergeReportId_transactionId_key" ON "MergeReportItem"("mergeReportId", "transactionId");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementUpload" ADD CONSTRAINT "BankStatementUpload_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementUpload" ADD CONSTRAINT "BankStatementUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "BankStatementUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TransactionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergeReport" ADD CONSTRAINT "MergeReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergeReportItem" ADD CONSTRAINT "MergeReportItem_mergeReportId_fkey" FOREIGN KEY ("mergeReportId") REFERENCES "MergeReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergeReportItem" ADD CONSTRAINT "MergeReportItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "BankTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
