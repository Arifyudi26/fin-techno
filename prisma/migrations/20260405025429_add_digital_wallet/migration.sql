-- CreateEnum
CREATE TYPE "WalletProvider" AS ENUM ('GOPAY', 'OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA', 'SAKUKU', 'JENIUS', 'OTHER');

-- CreateEnum
CREATE TYPE "UploadSourceType" AS ENUM ('BANK', 'WALLET');

-- CreateTable
CREATE TABLE "DigitalWallet" (
    "id" TEXT NOT NULL,
    "walletProvider" "WalletProvider" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "DigitalWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletStatementUpload" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileFormat" "FileFormat" NOT NULL,
    "fileSizeBytes" INTEGER,
    "walletProvider" "WalletProvider" NOT NULL,
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

    CONSTRAINT "WalletStatementUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
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

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DigitalWallet_walletProvider_idx" ON "DigitalWallet"("walletProvider");

-- CreateIndex
CREATE INDEX "DigitalWallet_ownerId_idx" ON "DigitalWallet"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalWallet_walletProvider_phoneNumber_ownerId_key" ON "DigitalWallet"("walletProvider", "phoneNumber", "ownerId");

-- CreateIndex
CREATE INDEX "WalletStatementUpload_walletId_idx" ON "WalletStatementUpload"("walletId");

-- CreateIndex
CREATE INDEX "WalletStatementUpload_uploadedById_idx" ON "WalletStatementUpload"("uploadedById");

-- CreateIndex
CREATE INDEX "WalletStatementUpload_status_idx" ON "WalletStatementUpload"("status");

-- CreateIndex
CREATE INDEX "WalletStatementUpload_periodStart_periodEnd_idx" ON "WalletStatementUpload"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "WalletStatementUpload_walletProvider_idx" ON "WalletStatementUpload"("walletProvider");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_hash_key" ON "WalletTransaction"("hash");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_uploadId_idx" ON "WalletTransaction"("uploadId");

-- CreateIndex
CREATE INDEX "WalletTransaction_transactionDate_idx" ON "WalletTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_status_idx" ON "WalletTransaction"("status");

-- AddForeignKey
ALTER TABLE "DigitalWallet" ADD CONSTRAINT "DigitalWallet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletStatementUpload" ADD CONSTRAINT "WalletStatementUpload_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "DigitalWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletStatementUpload" ADD CONSTRAINT "WalletStatementUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "DigitalWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "WalletStatementUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TransactionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
