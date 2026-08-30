export const auth = {
  id: {
    nameEmailPasswordRequired: "Nama, email, dan password wajib diisi",
    namedanPasswordRequired: "Nama dan password wajib diisi",
    emailPasswordRequired: "Email dan password wajib diisi",
    emailRegistered: "Email sudah terdaftar",
    emailNotFound: "Email tidak ditemukan",
    invalidCredentials: "Email atau password salah",
    credentialsValid: "Kredensial valid",
    tooManyLogin: "Terlalu banyak percobaan login. Silakan coba lagi nanti.",
    userNotFound: "User tidak ditemukan",
    userNotFoundRelogin: "User tidak ditemukan, silakan login ulang",

    // otp
    emailPurposeRequired: "Email dan purpose wajib diisi",
    emailCodePurposeRequired: "Email, kode, dan purpose wajib diisi",
    invalidPurpose: "Purpose tidak valid",
    otpSent: "OTP berhasil dikirim",
    otpFailedSend: "Gagal mengirim email OTP",
    otpWrong: "Kode OTP salah",
    otpExpired: "Kode OTP sudah kadaluarsa",
    otpInvalid: "Kode OTP tidak valid",
    tooManyOtpWrong: "Terlalu banyak percobaan OTP salah. Akun terkunci sementara.",
    tooManyOtp: "Terlalu banyak percobaan OTP. Silakan coba lagi nanti.",

    // password
    passwordChanged: "Password berhasil diubah",
    oldPasswordRequired: "Password lama wajib diisi",
    newPasswordRequired: "Password baru wajib diisi",
    oldPasswordWrong: "Password lama tidak sesuai",
  },
  en: {
    nameEmailPasswordRequired: "Name, email, and password are required",
    namedanPasswordRequired: "Name and password are required",
    emailPasswordRequired: "Email and password are required",
    emailRegistered: "Email is already registered",
    emailNotFound: "Email not found",
    invalidCredentials: "Invalid email or password",
    credentialsValid: "Credentials valid",
    tooManyLogin: "Too many login attempts. Please try again later.",
    userNotFound: "User not found",
    userNotFoundRelogin: "User not found, please log in again",

    // otp
    emailPurposeRequired: "Email and purpose are required",
    emailCodePurposeRequired: "Email, code, and purpose are required",
    invalidPurpose: "Invalid purpose",
    otpSent: "OTP sent successfully",
    otpFailedSend: "Failed to send OTP email",
    otpWrong: "Incorrect OTP code",
    otpExpired: "OTP code has expired",
    otpInvalid: "Invalid OTP code",
    tooManyOtpWrong: "Too many incorrect OTP attempts. Account temporarily locked.",
    tooManyOtp: "Too many OTP attempts. Please try again later.",

    // password
    passwordChanged: "Password changed successfully",
    oldPasswordRequired: "Old password is required",
    newPasswordRequired: "New password is required",
    oldPasswordWrong: "Old password does not match",
  },
} as const;
