type AdminPageTabsProps = {
  formLabel: string;
  listLabel: string;
  active: "form" | "list";
  onChange: (tab: "form" | "list") => void;
};

export function AdminPageTabs({ formLabel, listLabel, active, onChange }: AdminPageTabsProps) {
  return (
    <div className="flex gap-1 border-b border-line" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={active === "form"}
        onClick={() => onChange("form")}
        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
          active === "form"
            ? "border-sika-red text-sika-red-dark"
            : "border-transparent text-muted hover:text-ink"
        }`}
      >
        {formLabel}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "list"}
        onClick={() => onChange("list")}
        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
          active === "list"
            ? "border-sika-red text-sika-red-dark"
            : "border-transparent text-muted hover:text-ink"
        }`}
      >
        {listLabel}
      </button>
    </div>
  );
}
