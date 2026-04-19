import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Cookies from "js-cookie";
import useAuthStore from "@/store/authStore";
import OtpInput from "@components/auth/OtpInput";
import Toast from "@components/ui/toast/Toast";
import { useToast } from "@lib/hooks/useToast";
import axiosGlobal from "@/services/AxiosGlobal";

type Step = "loading" | "otp";

export default function OAuthCallback() {
  const { data: session, status } = useSession();
  const processed = useRef(false);
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const { toastState, fire, close } = useToast();

  useEffect(() => {
    if (processed.current) return;
    if (status === "unauthenticated") {
      window.location.href = "/auth/login";
      return;
    }
    if (status === "authenticated" && session?.appToken && session?.appId) {
      processed.current = true;
      const userEmail = session.user?.email ?? "";
      setEmail(userEmail);

      // Kirim OTP ke email OAuth user
      axiosGlobal.post("/auth/send-otp", { email: userEmail, purpose: "oauth" })
        .then(() => {
          setStep("otp");
        })
        .catch(() => {
          // Fallback: langsung login jika gagal kirim OTP
          finishLogin();
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  const finishLogin = (avatar?: string | null) => {
    if (!session) return;
    const { appToken, appId, appRole, appName } = session;
    Cookies.set("token", appToken as string, { expires: 1 });
    useAuthStore.getState().setId(appId as string);
    useAuthStore.getState().setToken(appToken as string);
    useAuthStore.getState().setRole(appRole as string);
    useAuthStore.getState().setName(appName as string);
    useAuthStore.getState().setAvatar(avatar ?? null);
    window.location.href = "/";
  };

  const handleVerifyOtp = async (code: string) => {
    setOtpLoading(true);
    try {
      const res = await axiosGlobal.post("/auth/verify-otp", { email, code, purpose: "oauth" });
      finishLogin(res.data.data?.avatar);
    } catch (error: unknown) {
      fire("error", "Verifikasi Gagal!", {
        message: (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Kode OTP salah atau kadaluarsa.",
        confirmText: "Coba Lagi",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await axiosGlobal.post("/auth/send-otp", { email, purpose: "oauth" });
      fire("success", "OTP Dikirim Ulang", { message: "Cek email kamu.", duration: 2000 });
    } catch {
      fire("error", "Gagal", { message: "Tidak bisa mengirim ulang OTP." });
    }
  };

  if (step === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Signing you in...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
      <Toast {...toastState} onClose={close} />
      <div className="w-full max-w-md p-8 border border-gray-200 rounded-2xl dark:border-gray-700">
        <div className="mb-6 text-center">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90">Verifikasi OTP</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Masukkan kode OTP yang dikirim ke email kamu.</p>
        </div>
        <OtpInput
          email={email}
          purpose="oauth"
          onVerified={handleVerifyOtp}
          onResend={handleResendOtp}
          loading={otpLoading}
        />
      </div>
    </div>
  );
}
