// yarn prisma db seed
import { PrismaClient, BankProvider, FileFormat, UploadStatus, TransactionType, MutationStatus, MergeStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {

  // ── 1. User ──────────────────────────────────────────────────────────────
  const hashedPassword = bcrypt.hashSync("password", 10);

  const user = await prisma.user.upsert({
    where: { email: "user@gmail.com" },
    update: {},
    create: {
      name: "Demo User",
      email: "user@gmail.com",
      password: hashedPassword,
      role: "user",
    },
  });

  // ── 2. Transaction Categories ─────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.transactionCategory.upsert({ where: { code: "OPS" }, update: {}, create: { name: "Operasional", code: "OPS", description: "Biaya operasional bisnis" } }),
    prisma.transactionCategory.upsert({ where: { code: "GAJ" }, update: {}, create: { name: "Gaji", code: "GAJ", description: "Pembayaran gaji karyawan" } }),
    prisma.transactionCategory.upsert({ where: { code: "PAJ" }, update: {}, create: { name: "Pajak", code: "PAJ", description: "Pembayaran pajak" } }),
    prisma.transactionCategory.upsert({ where: { code: "UTL" }, update: {}, create: { name: "Utilitas", code: "UTL", description: "Listrik, air, internet" } }),
    prisma.transactionCategory.upsert({ where: { code: "INV" }, update: {}, create: { name: "Investasi", code: "INV", description: "Pengeluaran investasi" } }),
    prisma.transactionCategory.upsert({ where: { code: "LNY" }, update: {}, create: { name: "Lainnya", code: "LNY", description: "Transaksi lainnya" } }),
  ]);

  const [catOps, catGaj, catPaj, catUtl, catInv, catLny] = categories;

  // ── 3. Bank Accounts ──────────────────────────────────────────────────────
  const accBCA = await prisma.bankAccount.upsert({
    where: { accountNumber: "1234567890" },
    update: {},
    create: {
      bankProvider: BankProvider.BCA,
      accountNumber: "1234567890",
      accountName: "Demo User",
      currency: "IDR",
      description: "Rekening Operasional BCA",
      isActive: true,
      ownerId: user.id,
    },
  });

  const accBRI = await prisma.bankAccount.upsert({
    where: { accountNumber: "0987654321" },
    update: {},
    create: {
      bankProvider: BankProvider.BRI,
      accountNumber: "0987654321",
      accountName: "Demo User",
      currency: "IDR",
      description: "Rekening Tabungan BRI",
      isActive: true,
      ownerId: user.id,
    },
  });

  await prisma.bankAccount.upsert({
    where: { accountNumber: "1122334455" },
    update: {},
    create: {
      bankProvider: BankProvider.MANDIRI,
      accountNumber: "1122334455",
      accountName: "Demo User",
      currency: "IDR",
      description: "Rekening Mandiri",
      isActive: false,
      ownerId: user.id,
    },
  });

  // ── 4. Uploads (e-statement per bulan) ───────────────────────────────────
  const months = [
    { start: new Date("2025-01-01"), end: new Date("2025-01-31") },
    { start: new Date("2025-02-01"), end: new Date("2025-02-28") },
    { start: new Date("2025-03-01"), end: new Date("2025-03-31") },
    { start: new Date("2025-04-01"), end: new Date("2025-04-30") },
  ];

  // BCA uploads
  const uploadsBCA = await Promise.all(
    months.map((m, i) =>
      prisma.bankStatementUpload.create({
        data: {
          bankAccountId: accBCA.id,
          uploadedById: user.id,
          fileName: `mutasi_bca_${m.start.toISOString().slice(0, 7)}.csv`,
          fileUrl: `/uploads/mutasi_bca_${m.start.toISOString().slice(0, 7)}.csv`,
          fileFormat: FileFormat.CSV,
          fileSizeBytes: 24000 + i * 1000,
          bankProvider: BankProvider.BCA,
          periodStart: m.start,
          periodEnd: m.end,
          status: UploadStatus.SUCCESS,
          totalRows: 30 + i * 5,
          parsedRows: 30 + i * 5,
          failedRows: 0,
          totalCredit: 25000000 + i * 3000000,
          totalDebit: 18000000 + i * 2000000,
        },
      })
    )
  );

  // BRI uploads
  const uploadsBRI = await Promise.all(
    months.map((m, i) =>
      prisma.bankStatementUpload.create({
        data: {
          bankAccountId: accBRI.id,
          uploadedById: user.id,
          fileName: `mutasi_bri_${m.start.toISOString().slice(0, 7)}.xlsx`,
          fileUrl: `/uploads/mutasi_bri_${m.start.toISOString().slice(0, 7)}.xlsx`,
          fileFormat: FileFormat.XLSX,
          fileSizeBytes: 18000 + i * 800,
          bankProvider: BankProvider.BRI,
          periodStart: m.start,
          periodEnd: m.end,
          status: UploadStatus.SUCCESS,
          totalRows: 20 + i * 3,
          parsedRows: 20 + i * 3,
          failedRows: 0,
          totalCredit: 12000000 + i * 1500000,
          totalDebit: 9000000 + i * 1000000,
        },
      })
    )
  );

  // ── 5. Transactions ───────────────────────────────────────────────────────
  const txData: Array<{
    bankAccountId: string;
    uploadId: string;
    transactionDate: Date;
    description: string;
    amount: number;
    type: TransactionType;
    balance: number;
    categoryId: string;
    status: MutationStatus;
    hash: string;
  }> = [];

  // Generate transactions for each BCA upload (4 months)
  const bcaTxTemplates = [
    { desc: "Transfer Masuk - PT Maju Jaya", amount: 15000000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Pembayaran Listrik PLN", amount: 1250000, type: TransactionType.DEBIT, catId: catUtl.id },
    { desc: "Gaji Karyawan", amount: 8200000, type: TransactionType.DEBIT, catId: catGaj.id },
    { desc: "Penjualan Produk Online", amount: 4500000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Pembelian Bahan Baku", amount: 3800000, type: TransactionType.DEBIT, catId: catOps.id },
    { desc: "Transfer Masuk - CV Sejahtera", amount: 7200000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Biaya Sewa Kantor", amount: 5000000, type: TransactionType.DEBIT, catId: catOps.id },
    { desc: "Penjualan Jasa Konsultasi", amount: 12000000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Pembayaran Pajak PPh", amount: 2100000, type: TransactionType.DEBIT, catId: catPaj.id },
    { desc: "Investasi Deposito", amount: 5000000, type: TransactionType.DEBIT, catId: catInv.id },
  ];

  uploadsBCA.forEach((upload, monthIdx) => {
    let runningBalance = 20000000 + monthIdx * 2000000;
    bcaTxTemplates.forEach((tpl, txIdx) => {
      const date = new Date(months[monthIdx].start);
      date.setDate(txIdx + 1);
      if (tpl.type === TransactionType.CREDIT) runningBalance += tpl.amount;
      else runningBalance -= tpl.amount;

      txData.push({
        bankAccountId: accBCA.id,
        uploadId: upload.id,
        transactionDate: date,
        description: tpl.desc,
        amount: tpl.amount,
        type: tpl.type,
        balance: runningBalance,
        categoryId: tpl.catId,
        status: MutationStatus.VERIFIED,
        hash: `bca-${monthIdx}-${txIdx}-${tpl.amount}`,
      });
    });
  });

  // Generate transactions for each BRI upload
  const briTxTemplates = [
    { desc: "Transfer Masuk - Klien A", amount: 8000000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Biaya Internet & Telepon", amount: 750000, type: TransactionType.DEBIT, catId: catUtl.id },
    { desc: "Pembayaran Supplier", amount: 4500000, type: TransactionType.DEBIT, catId: catOps.id },
    { desc: "Pendapatan Jasa", amount: 6500000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Biaya Administrasi Bank", amount: 150000, type: TransactionType.DEBIT, catId: catLny.id },
    { desc: "Transfer Masuk - Klien B", amount: 3200000, type: TransactionType.CREDIT, catId: catOps.id },
  ];

  uploadsBRI.forEach((upload, monthIdx) => {
    let runningBalance = 10000000 + monthIdx * 1000000;
    briTxTemplates.forEach((tpl, txIdx) => {
      const date = new Date(months[monthIdx].start);
      date.setDate(txIdx + 2);
      if (tpl.type === TransactionType.CREDIT) runningBalance += tpl.amount;
      else runningBalance -= tpl.amount;

      txData.push({
        bankAccountId: accBRI.id,
        uploadId: upload.id,
        transactionDate: date,
        description: tpl.desc,
        amount: tpl.amount,
        type: tpl.type,
        balance: runningBalance,
        categoryId: tpl.catId,
        status: monthIdx < 2 ? MutationStatus.VERIFIED : MutationStatus.PENDING,
        hash: `bri-${monthIdx}-${txIdx}-${tpl.amount}`,
      });
    });
  });

  // Bulk insert transactions
  await prisma.bankTransaction.createMany({ data: txData, skipDuplicates: true });

  // ── 6. Merge Report (Rekonsiliasi) ────────────────────────────────────────
  // Ambil beberapa transaksi untuk dimasukkan ke merge report
  const txForMerge = await prisma.bankTransaction.findMany({
    where: { bankAccountId: { in: [accBCA.id, accBRI.id] }, status: MutationStatus.VERIFIED },
    take: 12,
    orderBy: { transactionDate: "asc" },
  });

  const totalCredit = txForMerge
    .filter((t) => t.type === TransactionType.CREDIT)
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalDebit = txForMerge
    .filter((t) => t.type === TransactionType.DEBIT)
    .reduce((s, t) => s + Number(t.amount), 0);

  const mergeReport = await prisma.mergeReport.create({
    data: {
      name: "Rekonsiliasi Q1 2025",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      status: MergeStatus.MERGED,
      totalCredit,
      totalDebit,
      netFlow: totalCredit - totalDebit,
      createdById: user.id,
      notes: "Rekonsiliasi gabungan BCA & BRI Q1 2025",
      items: {
        create: txForMerge.map((tx) => ({
          transactionId: tx.id,
          isDuplicate: false,
        })),
      },
    },
  });
  console.log("Merge report created:", mergeReport.name);

  // Draft report
  await prisma.mergeReport.create({
    data: {
      name: "Draft Rekonsiliasi April 2025",
      periodStart: new Date("2025-04-01"),
      periodEnd: new Date("2025-04-30"),
      status: MergeStatus.DRAFT,
      totalCredit: 0,
      totalDebit: 0,
      netFlow: 0,
      createdById: user.id,
    },
  });

  console.log("\n Seed completed!");
  console.log("   Email   : user@gmail.com");
  console.log("   Password: password");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
