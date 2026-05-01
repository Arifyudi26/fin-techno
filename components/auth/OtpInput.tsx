import { useRef, useState, KeyboardEvent, ClipboardEvent } from "react";
import Button from "@components/ui/button/Button";
import type { OtpInputProps } from "@/lib/types/components";

export default function OtpInput({ email, onVerified, onResend, loading }: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = Array(6).fill("");
    pasted.split("").forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = () => {
    const code = otp.join("");
    if (code.length === 6) onVerified(code);
  };

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(b.length) + c);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Kode OTP telah dikirim ke
        </p>
        <p className="font-medium text-gray-800 dark:text-white">{maskedEmail}</p>
      </div>

      <div className="flex gap-3">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        ))}
      </div>

      <Button
        className="w-full"
        size="sm"
        onClick={handleSubmit}
        disabled={loading || otp.join("").length < 6}
      >
        {loading ? "Memverifikasi..." : "Verifikasi OTP"}
      </Button>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Tidak menerima kode?{" "}
        <button
          type="button"
          onClick={onResend}
          className="text-brand-500 hover:text-brand-600 dark:text-brand-400 font-medium"
        >
          Kirim ulang
        </button>
      </p>
    </div>
  );
}
