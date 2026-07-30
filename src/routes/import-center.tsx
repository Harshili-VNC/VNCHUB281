import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useWorkspace } from "@/lib/workspace";
import type { ImportExportModule } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/import-center")({
  head: () => ({
    meta: [{ title: "Import Center · VNC Global" }],
  }),
  component: ImportCenterPage,
});

type Preview = {
  jobId: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: { row: number; field: string; message: string }[];
};

function templateFor(module: ImportExportModule): string {
  return module === "Client Master"
    ? "name,legalName,businessUnit\nAcme Corp,Acme Corporation Ltd,EFA\n"
    : "firstName,lastName,email\nJane,Doe,jane.doe@example.com\n";
}

import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

function ImportCenterPage() {
  const { userPermissions } = useAuth();
  const { runImport } = useWorkspace();
  const [module, setModule] = useState<ImportExportModule>("Client Master");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  function downloadTemplate() {
    const blob = new Blob([templateFor(module)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${module.toLowerCase().replace(/\s+/g, "-")}-template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function parseAndImport() {
    if (!file) {
      toast.error("Choose a CSV file first");
      return;
    }
    setBusy(true);
    const text = await file.text();
    const result = await runImport({ module, fileName: file.name, fileText: text });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPreview(result);
    toast.success(
      result.failedRows === 0
        ? `${result.successRows} rows imported`
        : `${result.successRows} imported, ${result.failedRows} failed`,
    );
  }

  if (userPermissions && Object.keys(userPermissions).length > 0 && !hasPermission(userPermissions, "client.view") && !hasPermission(userPermissions, "system.import_data")) {
    return (
      <AppShell>
        <div className="p-12 text-center">
          <h2 className="text-xl font-bold text-destructive">403 — Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">You do not have permission to access the Import Center.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-8 pt-8 pb-4">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          Masters · Imports
        </div>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">Import Center</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
          Bulk import for the Client Master and Employee Master (CSV).
        </p>
      </div>

      <div className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-elevated p-5">
            <div className="text-[13px] font-semibold mb-3">Upload file</div>
            <div className="mb-3 max-w-[220px]">
              <Select value={module} onValueChange={(v) => setModule(v as ImportExportModule)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Client Master">Client Master</SelectItem>
                  <SelectItem value="Employee Master">Employee Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              <div className="text-xs text-muted-foreground mt-2">
                CSV only.{" "}
                {module === "Client Master"
                  ? "Records are created as Draft and require review."
                  : "Rows are validated only — employee accounts are created from the Users screen."}
              </div>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  Download template
                </Button>
                <Button size="sm" onClick={parseAndImport} disabled={busy}>
                  <Upload className="h-3.5 w-3.5" /> {busy ? "Parsing…" : "Parse & import"}
                </Button>
              </div>
            </div>
          </div>

          {preview && (
            <div className="rounded-2xl border border-border bg-elevated p-5">
              <div className="text-[13px] font-semibold mb-3">Result</div>
              <div className="flex items-center gap-4 mb-3 text-sm">
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {preview.successRows} valid rows
                </span>
                <span className="inline-flex items-center gap-1 text-red-600">
                  <XCircle className="h-3.5 w-3.5" /> {preview.failedRows} invalid rows
                </span>
              </div>
              {preview.errors.length > 0 && (
                <div className="border border-red-200 rounded-md p-3 bg-red-50/60">
                  <div className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2">
                    Errors
                  </div>
                  <ul className="text-xs space-y-1">
                    {preview.errors.map((e, i) => (
                      <li key={i} className="text-foreground/80">
                        Row <strong>{e.row}</strong> · <strong>{e.field}</strong> — {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-elevated p-5">
            <div className="text-[13px] font-semibold mb-3">Safety controls</div>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <div>• Client imports create records with <strong>Draft</strong> record status.</div>
              <div>• Employee imports are validate-only — no accounts are created in bulk.</div>
              <div>• Matching key: Client Name (Client Master).</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
