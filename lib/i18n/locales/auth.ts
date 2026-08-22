export const auth = {
  id: {
    // OTP
    otpSentTo: "Kode OTP telah dikirim ke",
    verifying: "Memverifikasi...",
    verifyOtp: "Verifikasi OTP",
    noCode: "Tidak menerima kode?",
    resend: "Kirim ulang",

    // Sign In
    signInTitle: "Sign In",
    signInSubtitle: "Masukkan email dan password kamu untuk masuk!",
    signInWithGoogle: "Masuk dengan Google",
    signInWithFacebook: "Masuk dengan Facebook",
    orDivider: "Atau",
    emailLabel: "Email",
    passwordLabel: "Password",
    passwordPlaceholder: "Masukkan password kamu",
    processing: "Memproses...",
    signIn: "Sign In",
    noAccount: "Belum punya akun?",
    signUp: "Sign Up",
    forgotPassword: "Lupa password?",

    // Sign Up
    signUpTitle: "Sign Up",
    signUpSubtitle: "Masukkan email dan password kamu untuk daftar!",
    nameLabel: "Nama",
    namePlaceholder: "Masukkan nama lengkap",
    emailPlaceholder: "Masukkan email kamu",
    passwordMinPlaceholder: "Min. 8 karakter",
    termsText: "Dengan membuat akun berarti kamu menyetujui",
    termsLink: "Syarat dan Ketentuan,",
    privacyLink: "Kebijakan Privasi",
    alreadyHaveAccount: "Sudah punya akun?",

    // OTP step title (shared)
    otpTitle: "Verifikasi OTP",
    otpSubtitle: "Masukkan kode OTP yang dikirim ke email kamu.",
  },
  en: {
    // OTP
    otpSentTo: "OTP code has been sent to",
    verifying: "Verifying...",
    verifyOtp: "Verify OTP",
    noCode: "Didn't receive a code?",
    resend: "Resend",

    // Sign In
    signInTitle: "Sign In",
    signInSubtitle: "Enter your email and password to sign in!",
    signInWithGoogle: "Sign in with Google",
    signInWithFacebook: "Sign in with Facebook",
    orDivider: "Or",
    emailLabel: "Email",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    processing: "Processing...",
    signIn: "Sign In",
    noAccount: "Don't have an account?",
    signUp: "Sign Up",
    forgotPassword: "Forgot password?",

    // Sign Up
    signUpTitle: "Sign Up",
    signUpSubtitle: "Enter your email and password to sign up!",
    nameLabel: "Name",
    namePlaceholder: "Enter your full name",
    emailPlaceholder: "Enter your email",
    passwordMinPlaceholder: "Min. 8 characters",
    termsText: "By creating an account means you agree to the",
    termsLink: "Terms and Conditions,",
    privacyLink: "Privacy Policy",
    alreadyHaveAccount: "Already have an account?",

    // OTP step title (shared)
    otpTitle: "OTP Verification",
    otpSubtitle: "Enter the OTP code sent to your email.",
  },
} as const;
