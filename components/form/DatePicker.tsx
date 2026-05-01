"use client";
import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import { Indonesian } from "flatpickr/dist/l10n/id";
import "flatpickr/dist/flatpickr.css";
import Label from "./Label";
import type { DatePickerProps } from "@/lib/types/form";

export default function DatePicker({
  id,
  label,
  placeholder = "dd/mm/yyyy",
  value,
  onChange,
  mode = "single",
}: DatePickerProps) {
  const fpRef = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;

    fpRef.current = flatpickr(el, {
      locale: Indonesian,
      mode,
      dateFormat: "d/m/Y",        // tampilan: DD/MM/YYYY
      altInput: false,
      allowInput: true,
      monthSelectorType: "static",
      onChange: (_, dateStr) => {
        // kirim ke parent dalam format YYYY-MM-DD (untuk API)
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const iso = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          onChange?.(iso);
        } else {
          onChange?.("");
        }
      },
    });

    return () => {
      fpRef.current?.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode]);

  // Sync value dari parent → flatpickr (misal saat reset)
  useEffect(() => {
    if (!fpRef.current) return;
    if (value) {
      // value dari parent: YYYY-MM-DD → convert ke Date
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) fpRef.current.setDate(new Date(y, m - 1, d), false);
    } else {
      fpRef.current.clear();
    }
  }, [value]);

  return (
    <>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          readOnly
          className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:placeholder:text-gray-600 cursor-pointer"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </>
  );
}
