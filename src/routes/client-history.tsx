import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { canDeleteClient } from "@/lib/client-visibility";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/client-history")({
  head: () => ({
    meta: [{ title: "Client History · VNC Global" }],
  }),
  component: ClientHistoryPage,
});

function ClientHistoryPage() {
  const { user } = useAuth();
  const { clients, restoreClient } = useWorkspace();

  // Deleted clients only — this page's entire reason for existing.
  const deletedClients = clients
    .filter((c) => c.deletedAt)
    .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());

  async function handleRestore(clientId: string, name: string) {
    const result = await restoreClient(clientId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${name} restored to the Client List`);
  }

  return (
    <AppShell>
      <div className="px-8 pt-8 pb-4">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          Masters · Clients
        </div>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">
          Client History
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
          Clients that have been deleted from the main Client List. Deletion is a soft delete —
          nothing here is permanently erased, and any record can be restored.
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground max-w-2xl">
          {deletedClients.length} deleted client{deletedClients.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="px-8 pb-10">
        {deletedClients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-14 text-center text-[13px] text-muted-foreground">
            No deleted clients. Anything removed from the Client List will show up here.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>BU</TableHead>
                  <TableHead>Deleted By</TableHead>
                  <TableHead>Deleted On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedClients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">{c.code ?? "—"}</TableCell>
                    <TableCell className="text-sm font-semibold">{c.name}</TableCell>
                    <TableCell className="text-xs">{c.businessUnit ?? "—"}</TableCell>
                    <TableCell className="text-xs">{c.deletedBy ?? "—"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {c.deletedAt
                        ? new Date(c.deletedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {canDeleteClient(user, c) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(c.id, c.name)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
