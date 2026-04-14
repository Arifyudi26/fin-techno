import { useState } from "react";
import { EyeCloseIcon, EyeIcon } from "@components/icons";
import Label from "@components/form/Label";
import Input from "@components/form/input/InputField";
import Button from "@components/ui/button/Button";
import Toast from "@components/ui/toast/Toast";
import OtpInput from "@components/auth/OtpInput";
import { useToast } from "@lib/hooks/useToast";
import axiosGlobal from "@/services/AxiosGlobal";
import useAuthStore from "@/store/authStore";

type Step = "form" | "otp";

export default function ChangePasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const { toastState, fire, close } = useToast();

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      fire("warning", "Form tidak lengkap", { message: "Semua field wajib diisi." });
      return;
    }
    if (newPassword.length < 8) {
      fire("warning", "Password terlalu pendek", { message: "Password minimal 8 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      fire("warning", "Password tidak cocok", { message: "Konfirmasi password tidak sesuai." });
      return;
    }
    setLoading(true);
    try {
      await axiosGlobal.post("/auth/send-otp", { email, purpose: "change-password" });
      setStep("otp");
      fire("success", "OTP Terkirim", { message: "Cek email kamu untuk kode OTP.", duration: 2000 });
    } catch (error: unknown) {
      fire("error", "Gagal!", {
        message: (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Email tidak ditemukan.",
        confirmText: "Coba Lagi",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setLoading(true);
    try {
      await axiosGlobal.post("/auth/verify-otp", { email, code, purpose: "change-password", password: newPassword });
      fire("success", "Password Berhasil Diubah!", { message: "Silakan login dengan password baru.", duration: 2000 });
      // Logout dan redirect ke login
      setTimeout(() => {
        useAuthStore.getState().logout();
        window.location.href = "/auth/login";
      }, 2000);
    } catch (error: unknown) {
      fire("error", "Verifikasi Gagal!", {
        message: (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Kode OTP salah atau kadaluarsa.",
        confirmText: "Coba Lagi",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await axiosGlobal.post("/auth/send-otp", { email, purpose: "change-password" });
      fire("success", "OTP Dikirim Ulang", { message: "Cek email kamu.", duration: 2000 });
    } catch {
      fire("error", "Gagal", { message: "Tidak bisa mengirim ulang OTP." });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 px-4">
      <Toast {...toastState} onClose={close} />
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            {step === "otp" ? "Verifikasi OTP" : "Ganti Password"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === "otp" ? "Masukkan kode OTP yang dikirim ke email kamu." : "Masukkan email dan password baru kamu."}
          </p>
        </div>

        {step === "otp" ? (
          <OtpInput
            email={email}
            purpose="change-password"
            onVerified={handleVerifyOtp}
            onResend={handleResendOtp}
            loading={loading}
          />
        ) : (
          <form onSubmit={handleSendOtp}>
            <div className="space-y-5">
              <div>
                <Label>Email <span className="text-error-500">*</span></Label>
                <Input type="email" placeholder="Email terdaftar" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Password Baru <span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input type={showNew ? "text" : "password"} placeholder="Min. 8 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                  <span onClick={() => setShowNew(!showNew)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                    {showNew ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                  </span>
                </div>
              </div>
              <div>
                <Label>Konfirmasi Password <span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input type={showConfirm ? "text" : "password"} placeholder="Ulangi password baru" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  <span onClick={() => setShowConfirm(!showConfirm)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                    {showConfirm ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                  </span>
                </div>
              </div>
              <Button className="w-full" size="sm" disabled={loading}>
                {loading ? "Memproses..." : "Kirim OTP"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
