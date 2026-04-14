import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(email: string, otp: string, purpose: string) {
  const purposeLabel: Record<string, string> = {
    login: "Login",
    register: "Registrasi",
    "change-password": "Ganti Password",
    oauth: "Verifikasi Akun",
  };

  await transporter.sendMail({
    from: `"MyFinance" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Kode OTP ${purposeLabel[purpose] ?? "Verifikasi"} - MyFinance`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#1d4ed8;margin-bottom:8px">Kode Verifikasi OTP</h2>
        <p style="color:#374151">Gunakan kode berikut untuk ${purposeLabel[purpose] ?? "verifikasi"} akun kamu:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#111827;text-align:center;padding:24px 0">${otp}</div>
        <p style="color:#6b7280;font-size:13px">Kode berlaku selama <strong>5 menit</strong>. Jangan bagikan kode ini kepada siapapun.</p>
      </div>
    `,
  });
}
