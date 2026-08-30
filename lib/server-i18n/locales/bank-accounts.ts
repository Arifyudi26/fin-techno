export const bankAccounts = {
  id: {
    accountExists: "Nomor rekening sudah terdaftar",
    accountNotFound: "Rekening tidak ditemukan",
    missingRequiredFields: "bankProvider, accountNumber, accountName wajib diisi",
    accountDeleted: "Rekening dan semua data terkait berhasil dihapus",
  },
  en: {
    accountExists: "Account number is already registered",
    accountNotFound: "Account not found",
    missingRequiredFields: "bankProvider, accountNumber, accountName are required",
    accountDeleted: "Account and all related data deleted successfully",
  },
} as const;
