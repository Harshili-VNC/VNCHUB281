import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Folder, Sparkles, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useAuth } from "@/lib/auth";
import {
  useWorkspace,
  documentCategories,
  documentsInCategory,
  formatFileSize,
  type DocumentCategory,
  type DocumentRecord,
} from "@/lib/workspace";
import { downloadDocumentFn } from "@/api/documents.mutations";
import { generateAnalysisReportFn, listAnalysisReportsFn } from "@/api/analysis.mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Documents · VNC Global" },
      {
        name: "description",
        content: "Central repository for contracts, MOMs, invoices, and reports.",
      },
      { property: "og:title", content: "Documents · VNC Global" },
      { property: "og:description", content: "Contracts, MOMs, invoices, and reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentsPage,
});

const categoryTone: Record<DocumentCategory, string> = {
  Contracts: "bg-[color:var(--primary)]/12 text-[color:var(--primary)]",
  MOMs: "bg-[color:var(--teal)]/12 text-[color:var(--teal)]",
  Invoices: "bg-[color:var(--emerald)]/12 text-[color:var(--emerald)]",
  Reports: "bg-[color:var(--purple)]/12 text-[color:var(--purple)]",
};

function canDelete(userPermissions?: Record<string, boolean>) {
  return hasPermission(userPermissions, "documents.delete");
}

function triggerBase64Download(base64: string, mimeType: string, fileName: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import { hasPermission } from "@/lib/permissions";

function DocumentsPage() {
  const { user, userPermissions, people } = useAuth();
  const { documents, clients, deleteDocument } = useWorkspace();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | "all">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  function clientName(clientId: string | null) {
    if (!clientId) return "—";
    return clients.find((c) => c.id === clientId)?.name ?? "—";
  }
  function uploaderName(id: string) {
    return people.find((p) => p.id === id)?.name ?? "—";
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents
      .filter((d) => categoryFilter === "all" || d.category === categoryFilter)
      .filter((d) => clientFilter === "all" || d.clientId === clientFilter)
      .filter(
        (d) =>
          !q ||
          d.fileName.toLowerCase().includes(q) ||
          clientName(d.clientId).toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q),
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, query, categoryFilter, clientFilter, clients]);

  if (!user) return null;

  async function handleDownload(doc: DocumentRecord) {
    const result = await downloadDocumentFn({ data: { id: doc.id } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    triggerBase64Download(result.base64, result.mimeType, result.fileName);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteDocument(deleteTarget.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${deleteTarget.fileName} deleted`);
    setDeleteTarget(null);
  }

  const selectedClient = clientFilter !== "all" ? clients.find((c) => c.id === clientFilter) : null;

  return (
    <AppShell>
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Repository
            </div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">
              Documents
            </h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
              Every contract, MOM, invoice, and report — searchable and organized by client.
            </p>
          </div>
          {hasPermission(userPermissions, "documents.upload") && (
            <Button onClick={() => setUploadOpen(true)} className="gap-1.5">
              <Upload className="h-4 w-4" /> Upload
            </Button>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] max-w-md h-9 flex items-center gap-2 px-2.5 rounded-lg bg-elevated border border-border">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents or clients…"
              className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground"
            />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClient && (
            <Button variant="outline" className="gap-1.5" onClick={() => setAnalysisOpen(true)}>
              <Sparkles className="h-4 w-4" /> Analyze {selectedClient.name}
            </Button>
          )}
        </div>
      </div>

      <div className="px-8 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {documentCategories.map((category) => {
          const count = documentsInCategory(documents, category).length;
          const active = categoryFilter === category;
          return (
            <button
              key={category}
              onClick={() => setCategoryFilter(active ? "all" : category)}
              className={`text-left rounded-2xl border p-5 shadow-sm hover:shadow-md transition ${
                active ? "border-border-strong bg-surface-2/60" : "border-border bg-elevated"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-xl grid place-items-center ${categoryTone[category]}`}
              >
                <Folder className="h-4 w-4" />
              </div>
              <div className="mt-4 text-[14px] font-semibold">{category}</div>
              <div className="text-[11.5px] text-muted-foreground num">{count} files</div>
            </button>
          );
        })}
      </div>

      <div className="px-8 pb-10">
        <div className="rounded-2xl border border-border bg-elevated shadow-sm overflow-hidden">
          <div className="h-12 px-5 flex items-center justify-between border-b border-border">
            <div className="text-[13px] font-semibold">
              Results <span className="text-muted-foreground font-normal">· {filtered.length}</span>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-5 py-14 text-center text-[13px] text-muted-foreground">
              No documents match your filters.
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="bg-surface-2/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">Name</th>
                  <th className="text-left font-semibold px-5 py-3">Category</th>
                  <th className="text-left font-semibold px-5 py-3">Client</th>
                  <th className="text-left font-semibold px-5 py-3">Uploaded by</th>
                  <th className="text-left font-semibold px-5 py-3">Size</th>
                  <th className="text-left font-semibold px-5 py-3">Date</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc, i) => (
                  <tr
                    key={doc.id}
                    className={`border-t border-border hover:bg-surface-2/60 transition ${i % 2 === 1 ? "bg-surface/40" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-accent text-accent-foreground grid place-items-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-medium truncate">{doc.fileName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-surface-2 border border-border text-muted-foreground">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{clientName(doc.clientId)}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {uploaderName(doc.uploadedBy)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground num">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground num">{doc.createdAt}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          title="Download"
                          onClick={() => handleDownload(doc)}
                          className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-surface-2"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {canDelete(userPermissions) && (
                          <button
                            title="Delete"
                            onClick={() => setDeleteTarget(doc)}
                            className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        clientNames={clients.map((c) => c.name)}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.fileName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the file and its record permanently. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedClient && (
        <AnalysisDialog
          open={analysisOpen}
          onOpenChange={setAnalysisOpen}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
        />
      )}
    </AppShell>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  clientNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientNames: string[];
}) {
  const { uploadDocument } = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("Contracts");
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setFile(null);
    setCategory("Contracts");
    setClientName("");
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      formData.append("clientName", clientName);
      const result = await uploadDocument(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`${file.name} uploaded`);
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
          <DialogDescription>Up to 20 MB. Anyone can upload.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="upload-file">File</Label>
            <Input
              id="upload-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="upload-client">Client (optional)</Label>
            <Input
              id="upload-client"
              list="upload-client-suggestions"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
            <datalist id="upload-client-suggestions">
              {clientNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          {error && (
            <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type StoredReport = { id: string; clientId: string; content: string; createdAt: string };

function AnalysisDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}) {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [selected, setSelected] = useState<StoredReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listAnalysisReportsFn({ data: { clientId } })
      .then((result) => {
        setReports(result);
        setSelected(result[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, [open, clientId]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generateAnalysisReportFn({ data: { clientId } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setReports((prev) => [result.report, ...prev]);
      setSelected(result.report);
      toast.success("Report generated");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analysis · {clientName}</DialogTitle>
          <DialogDescription>
            A metadata-based summary of this client's documents. Not AI-powered yet.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <div className="text-[11.5px] text-muted-foreground">
            {loading
              ? "Loading past reports…"
              : `${reports.length} report${reports.length === 1 ? "" : "s"} on file`}
          </div>
          <Button size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />{" "}
            {generating ? "Generating…" : "Generate new report"}
          </Button>
        </div>

        {reports.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition ${
                  selected?.id === r.id
                    ? "bg-surface-2 border border-border-strong"
                    : "text-muted-foreground hover:bg-surface-2 border border-transparent"
                }`}
              >
                {r.createdAt}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface/60 p-4">
          {selected ? (
            <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-6">
              {selected.content}
            </pre>
          ) : (
            <p className="text-[13px] text-muted-foreground text-center py-8">
              No report yet — click "Generate new report" to create one.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
