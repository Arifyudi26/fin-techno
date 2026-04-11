// yarn prisma db seed
import {
  PrismaClient,
  BankProvider,
  FileFormat,
  UploadStatus,
  TransactionType,
  EStatementStatus,
  MergeStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helpers
function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}
function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}
function fmt(date: Date) {
  return date.toISOString().slice(0, 7); // "2025-04"
}

async function main() {
  console.log("🌱 Seeding database...");

  // 1. User
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
  console.log("✅ User:", user.email);

  // 2. Categories (global, userId = null)
  async function upsertGlobalCategory(code: string, name: string, description: string) {
    const existing = await prisma.transactionCategory.findFirst({ where: { userId: null, code } });
    if (existing) return existing;
    return prisma.transactionCategory.create({ data: { name, code, description } });
  }

  const [catOps, catGaj, catPaj, catUtl, catInv, catLny] = await Promise.all([
    upsertGlobalCategory("OPS", "Operasional", "Biaya operasional bisnis"),
    upsertGlobalCategory("GAJ", "Gaji",        "Pembayaran gaji karyawan"),
    upsertGlobalCategory("PAJ", "Pajak",       "Pembayaran pajak"),
    upsertGlobalCategory("UTL", "Utilitas",    "Listrik, air, internet"),
    upsertGlobalCategory("INV", "Investasi",   "Pengeluaran investasi"),
    upsertGlobalCategory("LNY", "Lainnya",     "Transaksi lainnya"),
  ]);
  console.log("✅ Categories: 6");

  // 3. Bank Accounts
  const accBCA = await prisma.bankAccount.upsert({
    where: { accountNumber: "1234567890" },
    update: {},
    create: { bankProvider: BankProvider.BCA, accountNumber: "1234567890", accountName: "Demo User", currency: "IDR", description: "Rekening Operasional BCA", isActive: true, ownerId: user.id },
  });
  const accBRI = await prisma.bankAccount.upsert({
    where: { accountNumber: "0987654321" },
    update: {},
    create: { bankProvider: BankProvider.BRI, accountNumber: "0987654321", accountName: "Demo User", currency: "IDR", description: "Rekening Tabungan BRI", isActive: true, ownerId: user.id },
  });
  await prisma.bankAccount.upsert({
    where: { accountNumber: "1122334455" },
    update: {},
    create: { bankProvider: BankProvider.MANDIRI, accountNumber: "1122334455", accountName: "Demo User", currency: "IDR", description: "Rekening Mandiri", isActive: false, ownerId: user.id },
  });
  console.log("✅ Bank accounts: BCA, BRI, Mandiri");

  // 4. Generate 12 bulan ke belakang dari sekarang
  const now = new Date();
  const months: Array<{ start: Date; end: Date }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = addMonths(now, -i);
    months.push({ start: monthStart(d), end: monthEnd(d) });
  }

  // Template transaksi BCA per bulan
  const bcaTemplates = [
    { desc: "Transfer Masuk - PT Maju Jaya",     amount: 15_000_000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Pembayaran Listrik PLN",             amount:  1_250_000, type: TransactionType.DEBIT,  catId: catUtl.id },
    { desc: "Gaji Karyawan",                      amount:  8_200_000, type: TransactionType.DEBIT,  catId: catGaj.id },
    { desc: "Penjualan Produk Online",            amount:  4_500_000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Pembelian Bahan Baku",               amount:  3_800_000, type: TransactionType.DEBIT,  catId: catOps.id },
    { desc: "Transfer Masuk - CV Sejahtera",      amount:  7_200_000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Biaya Sewa Kantor",                  amount:  5_000_000, type: TransactionType.DEBIT,  catId: catOps.id },
    { desc: "Penjualan Jasa Konsultasi",          amount: 12_000_000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Pembayaran Pajak PPh",               amount:  2_100_000, type: TransactionType.DEBIT,  catId: catPaj.id },
    { desc: "Investasi Deposito",                 amount:  5_000_000, type: TransactionType.DEBIT,  catId: catInv.id },
    { desc: "Pendapatan Dividen",                 amount:  3_500_000, type: TransactionType.CREDIT, catId: catInv.id },
    { desc: "Biaya Pemasaran Digital",            amount:  2_500_000, type: TransactionType.DEBIT,  catId: catOps.id },
  ];

  // Template transaksi BRI per bulan
  const briTemplates = [
    { desc: "Transfer Masuk - Klien A",           amount:  8_000_000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Biaya Internet & Telepon",           amount:    750_000, type: TransactionType.DEBIT,  catId: catUtl.id },
    { desc: "Pembayaran Supplier",                amount:  4_500_000, type: TransactionType.DEBIT,  catId: catOps.id },
    { desc: "Pendapatan Jasa",                    amount:  6_500_000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Biaya Administrasi Bank",            amount:    150_000, type: TransactionType.DEBIT,  catId: catLny.id },
    { desc: "Transfer Masuk - Klien B",           amount:  3_200_000, type: TransactionType.CREDIT, catId: catOps.id },
    { desc: "Pembayaran BPJS",                    amount:    850_000, type: TransactionType.DEBIT,  catId: catGaj.id },
    { desc: "Penerimaan Royalti",                 amount:  2_800_000, type: TransactionType.CREDIT, catId: catLny.id },
  ];

  let totalUploads = 0;
  let totalTx = 0;

  for (let mIdx = 0; mIdx < months.length; mIdx++) {
    const m = months[mIdx];
    const monthLabel = fmt(m.start);

    // BCA upload
    const uploadBCA = await prisma.bankStatementUpload.create({
      data: {
        bankAccountId: accBCA.id,
        uploadedById: user.id,
        fileName: `e-statement_bca_${monthLabel}.csv`,
        fileUrl: `/uploads/e-statement_bca_${monthLabel}.csv`,
        fileFormat: FileFormat.CSV,
        fileSizeBytes: 22_000 + mIdx * 500,
        bankProvider: BankProvider.BCA,
        periodStart: m.start,
        periodEnd: m.end,
        status: UploadStatus.SUCCESS,
        totalRows: bcaTemplates.length,
        parsedRows: bcaTemplates.length,
        failedRows: 0,
        totalCredit: bcaTemplates.filter(t => t.type === TransactionType.CREDIT).reduce((s, t) => s + t.amount, 0),
        totalDebit:  bcaTemplates.filter(t => t.type === TransactionType.DEBIT).reduce((s, t) => s + t.amount, 0),
      },
    });

    // BRI upload
    const uploadBRI = await prisma.bankStatementUpload.create({
      data: {
        bankAccountId: accBRI.id,
        uploadedById: user.id,
        fileName: `e-statement_bri_${monthLabel}.xlsx`,
        fileUrl: `/uploads/e-statement_bri_${monthLabel}.xlsx`,
        fileFormat: FileFormat.XLSX,
        fileSizeBytes: 16_000 + mIdx * 400,
        bankProvider: BankProvider.BRI,
        periodStart: m.start,
        periodEnd: m.end,
        status: UploadStatus.SUCCESS,
        totalRows: briTemplates.length,
        parsedRows: briTemplates.length,
        failedRows: 0,
        totalCredit: briTemplates.filter(t => t.type === TransactionType.CREDIT).reduce((s, t) => s + t.amount, 0),
        totalDebit:  briTemplates.filter(t => t.type === TransactionType.DEBIT).reduce((s, t) => s + t.amount, 0),
      },
    });
    totalUploads += 2;

    // BCA transactions
    const bcaTxInserts: Array<{ hash: string; catId: string; txData: object }> = [];
    for (let txIdx = 0; txIdx < bcaTemplates.length; txIdx++) {
      const tpl = bcaTemplates[txIdx];
      const date = new Date(m.start);
      date.setDate(txIdx + 1);
      bcaTxInserts.push({
        hash: `bca-${mIdx}-${txIdx}`,
        catId: tpl.catId,
        txData: {
          bankAccountId: accBCA.id,
          uploadId: uploadBCA.id,
          transactionDate: date,
          description: tpl.desc,
          amount: tpl.amount + mIdx * 100_000,
          type: tpl.type,
          balance: 20_000_000 + mIdx * 1_500_000,
          status: EStatementStatus.VERIFIED,
          hash: `bca-${mIdx}-${txIdx}`,
        },
      });
    }

    // BRI transactions
    const briTxInserts: Array<{ hash: string; catId: string; txData: object }> = [];
    for (let txIdx = 0; txIdx < briTemplates.length; txIdx++) {
      const tpl = briTemplates[txIdx];
      const date = new Date(m.start);
      date.setDate(txIdx + 2);
      briTxInserts.push({
        hash: `bri-${mIdx}-${txIdx}`,
        catId: tpl.catId,
        txData: {
          bankAccountId: accBRI.id,
          uploadId: uploadBRI.id,
          transactionDate: date,
          description: tpl.desc,
          amount: tpl.amount + mIdx * 50_000,
          type: tpl.type,
          balance: 10_000_000 + mIdx * 800_000,
          status: mIdx >= 10 ? EStatementStatus.PENDING : EStatementStatus.VERIFIED,
          hash: `bri-${mIdx}-${txIdx}`,
        },
      });
    }

    const allInserts = [...bcaTxInserts, ...briTxInserts];

    // Batch insert transactions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.bankTransaction.createMany({ data: allInserts.map(i => i.txData) as any[], skipDuplicates: true });

    // Fetch inserted tx ids by hash to create junction records
    const insertedTx = await prisma.bankTransaction.findMany({
      where: { hash: { in: allInserts.map(i => i.hash) } },
      select: { id: true, hash: true },
    });
    const hashToId = Object.fromEntries(insertedTx.map(t => [t.hash!, t.id]));

    await prisma.bankTransactionCategory.createMany({
      data: allInserts
        .filter(i => hashToId[i.hash])
        .map(i => ({ transactionId: hashToId[i.hash], categoryId: i.catId })),
      skipDuplicates: true,
    });

    totalTx += allInserts.length;
  }

  console.log(`✅ Uploads: ${totalUploads}`);
  console.log(`✅ Transactions: ${totalTx}`);

  // 5. Merge Reports
  const verifiedTx = await prisma.bankTransaction.findMany({
    where: { bankAccount: { ownerId: user.id }, status: EStatementStatus.VERIFIED },
    take: 20,
    orderBy: { transactionDate: "asc" },
  });

  const mCredit = verifiedTx.filter(t => t.type === TransactionType.CREDIT).reduce((s, t) => s + Number(t.amount), 0);
  const mDebit  = verifiedTx.filter(t => t.type === TransactionType.DEBIT).reduce((s, t) => s + Number(t.amount), 0);

  // Rekonsiliasi Q1 tahun ini
  const thisYear = now.getFullYear();
  await prisma.mergeReport.create({
    data: {
      name: `Rekonsiliasi Q1 ${thisYear}`,
      periodStart: new Date(`${thisYear}-01-01`),
      periodEnd:   new Date(`${thisYear}-03-31`),
      status: MergeStatus.MERGED,
      totalCredit: mCredit,
      totalDebit:  mDebit,
      netFlow: mCredit - mDebit,
      createdById: user.id,
      notes: "Rekonsiliasi gabungan BCA & BRI",
      items: {
        create: verifiedTx.map(tx => ({ transactionId: tx.id, isDuplicate: false })),
      },
    },
  });

  // Draft bulan ini
  await prisma.mergeReport.create({
    data: {
      name: `Draft Rekonsiliasi ${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`,
      periodStart: monthStart(now),
      periodEnd:   monthEnd(now),
      status: MergeStatus.DRAFT,
      totalCredit: 0,
      totalDebit:  0,
      netFlow: 0,
      createdById: user.id,
    },
  });

  // Conflict report
  await prisma.mergeReport.create({
    data: {
      name: `Rekonsiliasi Feb ${thisYear} (Konflik)`,
      periodStart: new Date(`${thisYear}-02-01`),
      periodEnd:   new Date(`${thisYear}-02-28`),
      status: MergeStatus.CONFLICT,
      totalCredit: 25_000_000,
      totalDebit:  18_000_000,
      netFlow: 7_000_000,
      createdById: user.id,
      notes: "Ada duplikat transaksi yang perlu diselesaikan",
    },
  });

  console.log("✅ Merge reports: 3");

  console.log("\n🎉 Seed selesai!");
  console.log("   Email   : user@gmail.com");
  console.log("   Password: password");
  console.log(`   Data    : 12 bulan (${fmt(months[0].start)} s/d ${fmt(months[11].start)})`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
