import { ReactNode } from "react";

// Label
export interface LabelProps {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

// DatePicker
export interface DatePickerProps {
  id: string;
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (dateStr: string) => void;
  mode?: "single" | "range";
}

// InputField
export interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
}

// Checkbox
export interface CheckboxProps {
  label?: string;
  checked: boolean;
  className?: string;
  id?: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}
