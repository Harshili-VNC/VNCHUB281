import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  bad: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-border bg-surface-2 text-muted-foreground",
  accent: "border-accent/30 bg-accent/10 text-foreground",
};

const statusTone: Record<string, keyof typeof toneClass> = {
  Active: "good",
  Approved: "good",
  Completed: "good",
  Applied: "good",
  "On Hold": "warn",
  "Under Review": "warn",
  Processing: "warn",
  Pending: "warn",
  "Sent Back for Correction": "warn",
  "Completed with errors": "warn",
  "Non Active": "neutral",
  Draft: "neutral",
  Rejected: "bad",
  Failed: "bad",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = statusTone[status] ?? "neutral";
  return (
    <Badge variant="outline" className={cn(toneClass[tone], "font-medium", className)}>
      {status}
    </Badge>
  );
}
