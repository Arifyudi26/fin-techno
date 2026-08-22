import { useState } from "react";
import Link from "next/link";
import { EyeCloseIcon, EyeIcon } from "@components/icons";
import Label from "@components/form/Label";
import Input from "@components/form/input/InputField";
import Checkbox from "@components/form/input/Checkbox";
import Button from "@components/ui/button/Button";
import Toast from "@components/ui/toast/Toast";
import OtpInput from "@components/auth/OtpInput";
import { useToast } from "@lib/hooks/useToast";
import { useI18n } from "@lib/i18n";
import axiosGlobal from "@/services/AxiosGlobal";
import useAuthStore from "@/store/authStore";

type Step = "form" | "otp";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const { toastState, fire, close } = useToast();
  const { t } = useI18n();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      fire("warning", "Form tidak lengkap", { message: "Nama, email, dan password wajib diisi." });
      return;
    }
    if (password.length < 8) {
      fire("warning", "Password terlalu pendek", { message: "Password minimal 8 karakter." });
      return;
    }
    if (!isChecked) {
      fire("warning", "Syarat & Ketentuan", { message: "Harap setujui syarat dan ketentuan terlebih dahulu." });
      return;
    }
    setLoading(true);
    try {
      await axiosGlobal.post("/auth/send-otp", { email, purpose: "register" });
      setStep("otp");
      fire("success", "OTP Terkirim", { message: "Cek email kamu untuk kode OTP.", duration: 2000 });
    } catch (error: unknown) {
      fire("error", "Registrasi Gagal!", {
        message: (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Periksa kembali data kamu.",
        confirmText: "Coba Lagi",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setLoading(true);
    try {
      const res = await axiosGlobal.post("/auth/verify-otp", { email, code, purpose: "register", name, password });
      const { token, role, id, name: userName } = res.data.data;
      useAuthStore.getState().setId(id);
      useAuthStore.getState().setToken(token);
      useAuthStore.getState().setRole(role);
      useAuthStore.getState().setName(userName);
      useAuthStore.getState().setAvatar(null); // user baru belum punya avatar
      fire("success", "Registrasi Berhasil!", { message: `Selamat datang, ${userName}!`, duration: 1500 });
      setTimeout(() => { window.location.href = "/"; }, 1500);
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
      await axiosGlobal.post("/auth/send-otp", { email, purpose: "register" });
      fire("success", "OTP Dikirim Ulang", { message: "Cek email kamu.", duration: 2000 });
    } catch {
      fire("error", "Gagal", { message: "Tidak bisa mengirim ulang OTP." });
    }
  };

  return (
    <>
      <Toast {...toastState} onClose={close} />
      <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div>
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                {step === "otp" ? t.auth.otpTitle : t.auth.signUpTitle}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {step === "otp" ? t.auth.otpSubtitle : t.auth.signUpSubtitle}
              </p>
            </div>

            {step === "otp" ? (
              <OtpInput
                email={email}
                purpose="register"
                onVerified={handleVerifyOtp}
                onResend={handleResendOtp}
                loading={loading}
              />
            ) : (
              <div>
                <form onSubmit={onSubmit}>
                  <div className="space-y-5">
                    <div>
                      <Label>{t.auth.nameLabel} <span className="text-error-500">*</span></Label>
                      <Input type="text" placeholder={t.auth.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div>
                      <Label>{t.auth.emailLabel} <span className="text-error-500">*</span></Label>
                      <Input type="email" placeholder={t.auth.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                      <Label>{t.auth.passwordLabel} <span className="text-error-500">*</span></Label>
                      <div className="relative">
                        <Input placeholder={t.auth.passwordMinPlaceholder} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <span onClick={() => setShowPassword(!showPassword)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                          {showPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox className="w-5 h-5" checked={isChecked} onChange={setIsChecked} />
                      <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                        {t.auth.termsText}{" "}
                        <span className="text-gray-800 dark:text-white/90">{t.auth.termsLink}</span>{" "}
                        and our <span className="text-gray-800 dark:text-white">{t.auth.privacyLink}</span>
                      </p>
                    </div>
                    <div>
                      <Button className="w-full" size="sm" disabled={loading || !name.trim() || !email.trim() || !password.trim() || !isChecked}>
                        {loading ? t.auth.processing : t.auth.signUp}
                      </Button>
                    </div>
                  </div>
                </form>
                <div className="mt-5">
                  <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                    {t.auth.alreadyHaveAccount}{" "}
                    <Link href="/auth/login" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">{t.auth.signIn}</Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
