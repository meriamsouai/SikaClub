import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  large?: boolean;
  requiredMark?: boolean;
};

export function TextField({
  label,
  error,
  id,
  large = false,
  requiredMark = false,
  className = "",
  ...props
}: TextFieldProps) {
  const fieldId = id ?? props.name;
  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className={`mb-1.5 block font-medium text-ink ${large ? "text-lg" : "text-sm"}`}
      >
        {label}
        {requiredMark ? <span className="ml-0.5 text-sika-red">*</span> : null}
      </label>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`w-full rounded-md border border-line bg-white px-3 text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-sika-red focus:ring-2 focus:ring-sika-red/20 ${large ? "h-12 text-lg" : "h-11 text-sm"}`}
        {...props}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 text-sm text-sika-red-dark">
          {error}
        </p>
      ) : null}
    </div>
  );
}
