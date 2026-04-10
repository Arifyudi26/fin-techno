import { useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@components/icons";
import Label from "@components/form/Label";
import Input from "@components/form/input/InputField";
import Checkbox from "@components/form/input/Checkbox";
import Button from "@components/ui/button/Button";
import Toast from "@components/ui/toast/Toast";
import { useToast } from "@lib/hooks/useToast";
import axiosGlobal from "@/services/AxiosGlobal";
import useAuthStore from "@/store/authStore";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toastState, fire, close } = useToast();

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
      const res = await axiosGlobal.post("/auth/register", { name, email, password });
      const { token, role, id, name: userName } = res.data.data;

      useAuthStore.getState().setId(id);
      useAuthStore.getState().setToken(token);
      useAuthStore.getState().setRole(role);
      useAuthStore.getState().setName(userName);

      fire("success", "Registrasi Berhasil!", { message: `Selamat datang, ${userName}!`, duration: 1500 });
      setTimeout(() => { window.location.href = "/"; }, 1500);
    } catch (error: unknown) {
      fire("error", "Registrasi Gagal!", {
        message: (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Periksa kembali data kamu.",
        confirmText: "Coba Lagi",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast {...toastState} onClose={close} />
      <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <Link href="/" className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">Sign Up</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Enter your email and password to sign up!</p>
          </div>
          <div>
            <form onSubmit={onSubmit}>
              <div className="space-y-5">
                <div>
                  <Label>Nama <span className="text-error-500">*</span></Label>
                  <Input type="text" placeholder="Masukkan nama lengkap" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <Label>Email <span className="text-error-500">*</span></Label>
                  <Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>Password <span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <Input placeholder="Min. 8 karakter" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <span onClick={() => setShowPassword(!showPassword)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                      {showPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox className="w-5 h-5" checked={isChecked} onChange={setIsChecked} />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    By creating an account means you agree to the{" "}
                    <span className="text-gray-800 dark:text-white/90">Terms and Conditions,</span>{" "}
                    and our <span className="text-gray-800 dark:text-white">Privacy Policy</span>
                  </p>
                </div>
                <div>
                  <Button className="w-full" size="sm" disabled={loading || !name.trim() || !email.trim() || !password.trim() || !isChecked}>
                    {loading ? "Signing up..." : "Sign Up"}
                  </Button>
                </div>
              </div>
            </form>
            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">Sign In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
