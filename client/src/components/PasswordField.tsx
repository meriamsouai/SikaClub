import { useState } from "react";
import { TextField } from "./TextField";

type PasswordFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  large?: boolean;
  showLabel: string;
  hideLabel: string;
};

export function PasswordField({
  label,
  name,
  value,
  onChange,
  autoComplete = "current-password",
  large = false,
  showLabel,
  hideLabel,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <TextField
        large={large}
        label={label}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="[&_input]:pr-12"
      />
      <button
        type="button"
        className={`absolute right-3 text-muted hover:text-ink ${large ? "top-[2.7rem]" : "top-9"}`}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M3 3l18 18M10.5 10.7A3 3 0 0 0 12 15a3 3 0 0 0 2.3-1.1M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-4.1 4.8M6.1 6.3C3.7 8 2 12 2 12a18.7 18.7 0 0 0 6.2 6.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
