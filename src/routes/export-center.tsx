import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useWorkspace } from "@/lib/workspace";
import type { ImportExportModule } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/export-center")({
  head: () => ({
    meta: [{ title: "Export Center · VNC Global" }],
  }),
  component: ExportCenterPage,
});

function ExportCenterPage() {
  const { createExport, exportJobs } = useWorkspace();
  const [module, setModule] = useState<ImportExportModule>("Client Master");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const result = await createExport({ module });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${module.toLowerCase().replace(/\s+/g, "-")}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${result.rowCount} rows`);
  }

  const recentJobs = [...exportJobs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 8);

  return (
    <AppShell>
      <div className="px-8 pt-8 pb-4">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          Masters · Exports
        </div>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">Export Center</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
          Full export across the Client Master and Employee Master.
        </p>
      </div>

      <div className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-elevated p-5">
          <div className="text-[13px] font-semibold mb-3">Export configuration</div>
          <Label>Module</Label>
          <Select value={module} onValueChange={(v) => setModule(v as ImportExportModule)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Client Master">Client Master</SelectItem>
              <SelectItem value="Employee Master">Employee Master</SelectItem>
            </SelectContent>
          </Select>
          <Button className="mt-4" size="sm" onClick={run} disabled={busy}>
            <Download className="h-3.5 w-3.5" /> {busy ? "Exporting…" : "Export CSV"}
          </Button>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-elevated p-5">
          <div className="text-[13px] font-semibold mb-3">Recent exports</div>
          {recentJobs.length === 0 ? (
            <div className="text-xs text-muted-foreground">No exports yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentJobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between border-b border-border pb-2">
                  <span>
                    {j.module} · {j.rowCount} rows
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {j.createdAt} · {j.createdBy}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
