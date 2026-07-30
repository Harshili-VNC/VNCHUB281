import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  ShieldCheck,
  Search,
  RotateCcw,
  Copy,
  History,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Filter,
  Lock,
  Building2,
  Users,
  Briefcase,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  ALL_PERMISSIONS,
  PERMISSION_CATEGORIES,
  type PermissionCategory,
  type PermissionDefinition,
} from "@/lib/permissions";
import { useQueryClient } from "@tanstack/react-query";
import { getPermissionMatrixFn, getPermissionAuditLogsFn } from "@/api/permissions.queries";
import { savePermissionsFn, resetPermissionsFn, clonePermissionsFn } from "@/api/permissions.mutations";
import { BOOTSTRAP_QUERY_KEY } from "@/api/queries";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/permission-management")({
  head: () => ({
    meta: [
      { title: "Enterprise Permission Management · VNC Global" },
      { name: "description", content: "Configure enterprise access control rules and designation permissions." },
    ],
  }),
  component: PermissionManagementPage,
});

type Designation = {
  id: string;
  name: string;
  rank?: number;
};

type MatrixState = Record<string, Record<string, boolean>>;

type AuditLog = {
  id: string;
  changedBy: string;
  changedByName: string;
  designationId: string;
  designationName: string;
  permissionId: string;
  permissionName: string;
  previousValue: boolean;
  newValue: boolean;
  changedAt: string | Date;
};

function PermissionManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = Boolean(
    user &&
      ((user.designation || "").toLowerCase().includes("admin") ||
        user.departmentFunction === "Admin")
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"matrix" | "audit">("matrix");
  
  // Data state
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [initialMatrix, setInitialMatrix] = useState<MatrixState>({});
  const [matrix, setMatrix] = useState<MatrixState>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDesignationId, setSelectedDesignationId] = useState<string>("ALL");

  // Accordion state: All categories collapsed by default when page loads
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Clone Modal state
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState("");
  const [cloneTargetId, setCloneTargetId] = useState("");

  // Load Matrix Data
  async function loadData() {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await getPermissionMatrixFn();
      setDesignations(res.designations || []);
      setInitialMatrix(res.matrix || {});
      setMatrix(JSON.parse(JSON.stringify(res.matrix || {})));
    } catch (err: any) {
      console.error("Failed to load permission matrix:", err);
      toast.error(err?.message || "Failed to load permission matrix");
    } finally {
      setLoading(false);
    }
  }

  // Load Audit Logs
  async function loadLogs() {
    if (!isAdmin) return;
    try {
      const res = await getPermissionAuditLogsFn();
      setAuditLogs(res.logs || []);
    } catch (err: any) {
      console.error("Failed to load permission audit logs:", err);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && activeTab === "audit") {
      loadLogs();
    }
  }, [isAdmin, activeTab]);

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="p-12 text-center">
          <h2 className="text-xl font-bold text-destructive">403 — Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Permission Management is accessible only to system Administrators.
          </p>
        </div>
      </AppShell>
    );
  }

  // Compute pending unsaved changes
  const pendingChanges = useMemo(() => {
    const changes: { designationId: string; permissionId: string; isEnabled: boolean }[] = [];
    for (const dId of Object.keys(matrix)) {
      for (const pId of Object.keys(matrix[dId] || {})) {
        const currentVal = matrix[dId][pId];
        const initialVal = initialMatrix[dId]?.[pId] ?? false;
        if (currentVal !== initialVal) {
          changes.push({ designationId: dId, permissionId: pId, isEnabled: currentVal });
        }
      }
    }
    return changes;
  }, [matrix, initialMatrix]);

  // Toggle single permission
  function handleToggle(designationId: string, permissionId: string) {
    setMatrix((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[designationId]) next[designationId] = {};
      next[designationId][permissionId] = !next[designationId][permissionId];
      return next;
    });
  }

  // Toggle all permissions for a designation row
  function handleToggleAllForDesignation(designationId: string, enable: boolean) {
    setMatrix((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[designationId]) next[designationId] = {};
      for (const p of ALL_PERMISSIONS) {
        next[designationId][p.id] = enable;
      }
      return next;
    });
  }

  // Toggle category section expansion
  function toggleCategoryExpand(cat: string) {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  // Discard local changes
  function handleDiscard() {
    setMatrix(JSON.parse(JSON.stringify(initialMatrix)));
    toast.info("Unsaved changes discarded.");
  }

  // Save changes to backend
  async function handleSave() {
    if (pendingChanges.length === 0) return;
    setSaving(true);
    try {
      const res = await savePermissionsFn({ data: { changes: pendingChanges } });
      toast.success(`Successfully saved ${res.count} permission updates.`);
      queryClient.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      await loadData();
    } catch (err: any) {
      console.error("Save permissions error:", err);
      toast.error(err?.message || "Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  }

  // Reset matrix to production defaults
  async function handleResetToDefaults() {
    if (!confirm("Are you sure you want to reset permissions to default system standards? This action will overwrite modified rules.")) {
      return;
    }
    setSaving(true);
    try {
      const res = await resetPermissionsFn({ data: {} });
      toast.success(`Permissions reset successfully (${res.count} rules restored).`);
      queryClient.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset permissions.");
    } finally {
      setSaving(false);
    }
  }

  // Execute Clone
  async function handleClone() {
    if (!cloneSourceId || !cloneTargetId) {
      toast.error("Please select both source and target designations.");
      return;
    }
    if (cloneSourceId === cloneTargetId) {
      toast.error("Source and target designations must be different.");
      return;
    }
    setSaving(true);
    try {
      await clonePermissionsFn({
        data: { sourceDesignationId: cloneSourceId, targetDesignationId: cloneTargetId },
      });
      toast.success("Permissions cloned successfully.");
      setCloneModalOpen(false);
      queryClient.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to clone permissions.");
    } finally {
      setSaving(false);
    }
  }

  // Filtered lists
  const filteredPermissions = useMemo(() => {
    return ALL_PERMISSIONS.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  const filteredDesignations = useMemo(() => {
    return designations.filter((d) => selectedDesignationId === "ALL" || d.id === selectedDesignationId);
  }, [designations, selectedDesignationId]);

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const map: Record<string, PermissionDefinition[]> = {};
    for (const cat of PERMISSION_CATEGORIES) {
      const list = filteredPermissions.filter((p) => p.category === cat);
      if (list.length > 0) {
        map[cat] = list;
      }
    }
    return map;
  }, [filteredPermissions]);

  return (
    <AppShell>
      <div className="space-y-6 pb-24">
        {/* Top Header */}
        <PageHeader
          title="Permission Management"
          description="Enterprise Access Control Matrix — Configure granular permissions per designation without code changes."
        />

        {/* Tab Navigation & Primary Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === "matrix"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-surface-3"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Permission Matrix
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === "audit"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-surface-3"
              }`}
            >
              <History className="h-4 w-4" />
              Audit Trail & Logs
            </button>
          </div>

          {activeTab === "matrix" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCloneModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-accent transition"
              >
                <Copy className="h-3.5 w-3.5" />
                Clone Rules
              </button>
              <button
                onClick={handleResetToDefaults}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Defaults
              </button>
            </div>
          )}
        </div>

        {/* --- TAB 1: PERMISSION MATRIX VIEW --- */}
        {activeTab === "matrix" && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-card border border-border shadow-xs">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search permission or module..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-surface border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ALL">All Categories (8)</option>
                  {PERMISSION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Designation Filter */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={selectedDesignationId}
                  onChange={(e) => setSelectedDesignationId(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-surface border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ALL">All Designations ({designations.length})</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Matrix Table */}
            {loading ? (
              <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                Loading Enterprise Permission Matrix...
              </div>
            ) : Object.keys(groupedPermissions).length === 0 ? (
              <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
                No permissions found matching search filters.
              </div>
            ) : (
              <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-surface-2 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        <th className="py-3.5 px-4 min-w-[280px]">Permission & Category</th>
                        {filteredDesignations.map((d) => (
                          <th key={d.id} className="py-3.5 px-3 text-center min-w-[120px]">
                            <div className="font-semibold text-foreground">{d.name}</div>
                            <div className="flex justify-center items-center gap-1.5 mt-1">
                              <button
                                onClick={() => handleToggleAllForDesignation(d.id, true)}
                                className="text-[10px] lowercase text-emerald-600 hover:underline"
                                title={`Enable all for ${d.name}`}
                              >
                                All On
                              </button>
                              <span className="text-muted-foreground">/</span>
                              <button
                                onClick={() => handleToggleAllForDesignation(d.id, false)}
                                className="text-[10px] lowercase text-destructive hover:underline"
                                title={`Disable all for ${d.name}`}
                              >
                                Off
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {Object.entries(groupedPermissions).map(([cat, perms]) => {
                        const isExpanded = Boolean(expandedCategories[cat]);
                        return (
                          <ReactGroupCategory
                            key={cat}
                            categoryName={cat}
                            permissionsList={perms}
                            designationsList={filteredDesignations}
                            matrixState={matrix}
                            isExpanded={isExpanded}
                            onToggleExpand={() => toggleCategoryExpand(cat)}
                            onToggleCell={handleToggle}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: AUDIT TRAIL VIEW --- */}
        {activeTab === "audit" && (
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs p-4">
            <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Permission Modification Audit History
            </h3>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No permission modification audit entries recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Changed By</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3">Permission</th>
                      <th className="p-3 text-center">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-1">
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.changedAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-medium text-foreground">{log.changedByName}</td>
                        <td className="p-3 text-foreground">{log.designationName}</td>
                        <td className="p-3 text-foreground">{log.permissionName}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                              log.newValue
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {log.previousValue ? "ON" : "OFF"} → {log.newValue ? "ON" : "OFF"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- STICKY UNSAVED CHANGES BAR --- */}
        {pendingChanges.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl bg-foreground text-background dark:bg-card dark:text-foreground border border-border shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Unsaved Permission Changes</div>
                <div className="text-xs opacity-80">
                  {pendingChanges.length} permission rule(s) pending save.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDiscard}
                disabled={saving}
                className="px-3.5 py-2 text-xs font-medium rounded-xl border border-border/50 hover:bg-background/20 transition disabled:opacity-50"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-md disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* --- CLONE PERMISSIONS MODAL --- */}
        {cloneModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Copy className="h-4 w-4 text-primary" />
                  Clone Permission Profile
                </h3>
                <button
                  onClick={() => setCloneModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Copy all permission toggle configurations from a source designation to a target designation.
              </p>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-medium mb-1">Source Designation (Copy From)</label>
                  <select
                    value={cloneSourceId}
                    onChange={(e) => setCloneSourceId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-surface border border-input focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- Select Source --</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Target Designation (Apply To)</label>
                  <select
                    value={cloneTargetId}
                    onChange={(e) => setCloneTargetId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-surface border border-input focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- Select Target --</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => setCloneModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClone}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  Confirm Clone
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ReactGroupCategory({
  categoryName,
  permissionsList,
  designationsList,
  matrixState,
  isExpanded,
  onToggleExpand,
  onToggleCell,
}: {
  categoryName: string;
  permissionsList: PermissionDefinition[];
  designationsList: Designation[];
  matrixState: MatrixState;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleCell: (designationId: string, permissionId: string) => void;
}) {
  return (
    <>
      <tr
        onClick={onToggleExpand}
        className="bg-surface-2/90 hover:bg-surface-3 cursor-pointer select-none transition-colors duration-200 border-y border-border"
      >
        <td
          colSpan={designationsList.length + 1}
          className="py-3 px-4 font-semibold text-xs text-foreground tracking-wider"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-muted-foreground transition-transform duration-200 inline-block">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-primary" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            <span className="font-semibold text-foreground text-sm tracking-normal capitalize">
              {categoryName}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              ({permissionsList.length} Rules)
            </span>
          </div>
        </td>
      </tr>

      {isExpanded &&
        permissionsList.map((perm) => (
          <tr
            key={perm.id}
            className="hover:bg-surface-1/50 transition-colors duration-200 animate-in fade-in slide-in-from-top-1 duration-250"
          >
            <td className="py-3 px-4">
              <div className="font-medium text-foreground text-xs">{perm.name}</div>
              <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {perm.description}
              </div>
            </td>
            {designationsList.map((desig) => {
              const isEnabled = matrixState[desig.id]?.[perm.id] ?? false;
              return (
                <td key={desig.id} className="py-3 px-3 text-center align-middle">
                  <button
                    type="button"
                    onClick={() => onToggleCell(desig.id, perm.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      isEnabled ? "bg-emerald-600" : "bg-muted"
                    }`}
                    role="switch"
                    aria-checked={isEnabled}
                    title={`${perm.name} for ${desig.name}: ${isEnabled ? "ON" : "OFF"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
    </>
  );
}
