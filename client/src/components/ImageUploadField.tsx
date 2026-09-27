import { useEffect, useId, useRef, useState } from "react";

type ImageUploadFieldProps = {
  label: string;
  hint?: string;
  chooseLabel: string;
  clearLabel: string;
  required?: boolean;
  accept?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Shown when no new file is selected (e.g. existing image while editing). */
  existingUrl?: string;
  previewAspectClassName?: string;
};

export function ImageUploadField({
  label,
  hint,
  chooseLabel,
  clearLabel,
  required = false,
  accept = "image/*",
  file,
  onFileChange,
  existingUrl = "",
  previewAspectClassName = "aspect-[4/3]",
}: ImageUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewSrc = objectUrl ?? (existingUrl || "");

  function clear() {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-sika-red"> *</span> : null}
      </p>
      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`relative flex w-full items-center justify-center bg-canvas/80 ${previewAspectClassName} hover:bg-canvas`}
        >
          {previewSrc ? (
            <img src={previewSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="px-3 text-center text-sm font-medium text-muted">{chooseLabel}</span>
          )}
          {previewSrc ? (
            <span className="absolute inset-x-0 bottom-0 bg-ink/55 px-2 py-1.5 text-center text-xs font-semibold text-white">
              {chooseLabel}
            </span>
          ) : null}
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          required={required && !file && !existingUrl}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
            <p className="min-w-0 truncate text-xs text-muted">{file.name}</p>
            <button
              type="button"
              onClick={clear}
              className="shrink-0 text-xs font-semibold text-sika-red-dark hover:underline"
            >
              {clearLabel}
            </button>
          </div>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
