import { Download, Filter, Plus, Search } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  showToolbar = true,
  searchPlaceholder = "Search…",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  showToolbar?: boolean;
  searchPlaceholder?: string;
}) {
  return (
    <div className="px-8 pt-8 pb-4">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              {eyebrow}
            </div>
          )}
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions ?? (
            <>
              <button className="h-9 px-3 rounded-lg border border-border bg-elevated hover:border-border-strong text-[13px] inline-flex items-center gap-1.5 transition">
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              <button className="h-9 px-3 rounded-lg text-[13px] font-medium bg-[image:var(--gradient-primary)] text-white shadow-glow inline-flex items-center gap-1.5 hover:opacity-95 transition">
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            </>
          )}
        </div>
      </div>
      {showToolbar && (
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[260px] max-w-md h-9 flex items-center gap-2 px-2.5 rounded-lg bg-elevated border border-border">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground"
            />
          </div>
          <button className="h-9 px-3 rounded-lg border border-border bg-elevated hover:border-border-strong text-[13px] inline-flex items-center gap-1.5 transition">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
          <div className="h-6 w-px bg-border mx-1" />
          <TabChip label="All" active />
          <TabChip label="Active" />
          <TabChip label="Archived" />
        </div>
      )}
    </div>
  );
}

function TabChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={
        active
          ? "h-9 px-3 rounded-lg text-[13px] font-medium bg-surface-2 border border-border-strong"
          : "h-9 px-3 rounded-lg text-[13px] text-muted-foreground hover:bg-surface-2 border border-transparent"
      }
    >
      {label}
    </button>
  );
}
