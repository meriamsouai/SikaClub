import type { ReactNode } from "react";

type AlertProps = {
  tone?: "error" | "warning" | "info";
  children: ReactNode;
};

const tones = {
  error: "border-sika-red/25 bg-red-50 text-sika-red-dark",
  warning: "border-sika-yellow bg-sika-yellow-soft text-ink",
  info: "border-line bg-white text-ink",
};

export function Alert({ tone = "error", children }: AlertProps) {
  return (
    <div role="alert" className={`rounded-md border px-4 py-3 text-sm leading-6 ${tones[tone]}`}>
      {children}
    </div>
  );
}
