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
import { useI18n } from "@lib/i18n";

type Step = "form" | "otp";

export default function ChangePasswordPage() {
  const { t } = useI18n();
  const tr = t.auth;
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
      fire("warning", tr.formIncomplete, { message: tr.emailPasswordRequired });
      return;
    }
    if (newPassword.length < 8) {
      fire("warning", tr.passwordTooShort, { message: tr.passwordMinChars });
      return;
    }
    if (newPassword !== confirmPassword) {
      fire("warning", tr.passwordMismatch, { message: tr.passwordMismatchMsg });
      return;
    }
    setLoading(true);
    try {
      await axiosGlobal.post("/auth/send-otp", { email, purpose: "change-password" });
      setStep("otp");
      fire("success", tr.otpSent, { message: tr.otpSentMsg, duration: 2000 });
    } catch (error: unknown) {
      fire("error", tr.failed, {
        message: (error as { response?: { data?: { message?: string } } }).response?.data?.message || tr.emailNotFound,
        confirmText: tr.tryAgain,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setLoading(true);
    try {
      await axiosGlobal.post("/auth/verify-otp", { email, code, purpose: "change-password", password: newPassword });
      fire("success", tr.changePasswordSuccess, { message: tr.changePasswordSuccessMsg, duration: 2000 });
      // Logout dan redirect ke login
      setTimeout(() => {
        useAuthStore.getState().logout();
        window.location.href = "/auth/login";
      }, 2000);
    } catch (error: unknown) {
      fire("error", tr.verifyFailed, {
        message: (error as { response?: { data?: { message?: string } } }).response?.data?.message || tr.verifyFailedMsg,
        confirmText: tr.tryAgain,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await axiosGlobal.post("/auth/send-otp", { email, purpose: "change-password" });
      fire("success", tr.otpResent, { message: tr.otpResentMsg, duration: 2000 });
    } catch {
      fire("error", tr.failed, { message: tr.resendFailed });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 px-4">
      <Toast {...toastState} onClose={close} />
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            {step === "otp" ? tr.otpTitle : tr.changePasswordTitle}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === "otp" ? tr.otpSubtitle : tr.changePasswordSubtitle}
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
                <Label>{tr.emailLabel} <span className="text-error-500">*</span></Label>
                <Input type="email" placeholder={tr.emailRegisteredPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>{tr.newPasswordLabel} <span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input type={showNew ? "text" : "password"} placeholder={tr.passwordMinPlaceholder} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                  <span onClick={() => setShowNew(!showNew)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                    {showNew ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                  </span>
                </div>
              </div>
              <div>
                <Label>{tr.confirmPasswordLabel} <span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input type={showConfirm ? "text" : "password"} placeholder={tr.confirmPasswordPlaceholder} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  <span onClick={() => setShowConfirm(!showConfirm)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                    {showConfirm ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                  </span>
                </div>
              </div>
              <Button className="w-full" size="sm" disabled={loading}>
                {loading ? tr.processing : tr.sendOtpBtn}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
