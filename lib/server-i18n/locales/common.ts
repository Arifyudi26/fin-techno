export const common = {
  id: {
    unauthorized: "Tidak terautentikasi",
    noUsersFound: "Tidak ada pengguna dengan peran user",
    forbidden: "Akses ditolak",
    forbiddenAdminOnly: "Akses ditolak: khusus admin",
    serverError: "Terjadi kesalahan pada server",
    methodNotAllowed: "Metode tidak diizinkan",
    invalidJsonBody: "Body JSON tidak valid",
    success: "Berhasil",
  },
  en: {
    unauthorized: "Unauthorized",
    noUsersFound: "No users found with role user",
    forbidden: "Forbidden",
    forbiddenAdminOnly: "Forbidden: admin only",
    serverError: "Internal server error",
    methodNotAllowed: "Method not allowed",
    invalidJsonBody: "Invalid JSON body",
    success: "Success",
  },
} as const;
