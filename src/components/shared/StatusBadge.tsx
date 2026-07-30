import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

export function StatusBadge({
  status,
  updatedAt,
  updatedBy,
  className,
}: {
  status: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  className?: string;
}) {
  const tone = statusTone[status] ?? "neutral";
  const badgeNode = (
    <Badge variant="outline" className={cn(toneClass[tone], "font-medium cursor-help", className)}>
      {status}
    </Badge>
  );

  if (!updatedAt && !updatedBy) {
    return badgeNode;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeNode}</TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground border border-border p-2.5 shadow-md max-w-xs space-y-1">
          <div className="font-semibold text-xs text-foreground">Current Status: {status}</div>
          {updatedAt && (
            <div className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Status Since:</span> {updatedAt}
            </div>
          )}
          {updatedBy && (
            <div className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Last Updated By:</span> {updatedBy}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
