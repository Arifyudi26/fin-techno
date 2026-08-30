// Covers dashboard, reports, calendar, and transactions endpoints.
export const reports = {
  id: {
    dateRangeRequired: "dateFrom dan dateTo wajib diisi",
    dateFormatInvalid: "date harus berformat YYYY-MM-DD",
  },
  en: {
    dateRangeRequired: "dateFrom and dateTo are required",
    dateFormatInvalid: "date must be in YYYY-MM-DD format",
  },
} as const;
