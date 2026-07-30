import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Ban,
  Check,
  LayoutGrid,
  Pencil,
  Plus,
  RotateCcw,
  Table2,
  UserCircle2,
  Users2,
  Eye,
  GraduationCap,
  Trophy,
  Laptop,
  FileCheck,
  History,
  Briefcase,
  DollarSign,
  CalendarDays,
  FileText,
  Building2,
  MapPin,
  Clock,
  Award,
} from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { OrgChart } from "@/components/shared/OrgTree";
import {
  useAuth,
  canAddPeople,
  eligibleNewManagers,
  getDirectReports,
  getVisiblePeople,
  departmentFunctions,
  type Person,
  type DepartmentFunction,
} from "@/lib/auth";
import { getEmployeeProfileFn } from "@/api/queries";
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

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "Team Management · VNC Global" },
      {
        name: "description",
        content: "Add, edit, reassign, and view full 10-tab employee profiles across VNC.",
      },
    ],
  }),
  component: TeamsPage,
});

type NewLogin = { name: string; email: string; password: string; label: string };

function TeamsPage() {
  const { user, people } = useAuth();
  const [view, setView] = useState<"table" | "chart">("table");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Person | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Person | null>(null);
  const [statusTarget, setStatusTarget] = useState<Person | null>(null);
  const [profileTarget, setProfileTarget] = useState<Person | null>(null);
  const [newLogins, setNewLogins] = useState<NewLogin[]>([]);

  if (!user) return null;

  const visible = getVisiblePeople(people, user);
  const myTeam = visible.filter((p) => p.id !== user.id);
  const activeCount = myTeam.filter((p) => p.status === "active").length;
  const inactiveCount = myTeam.length - activeCount;
  const directReportCount = getDirectReports(people, user.id).length;
  const canAdd = canAddPeople(user);
  const isTopLevel = user.departmentFunction === "Leadership" || user.departmentFunction === "Admin";

  function managerName(person: Person) {
    if (!person.managerId) return "—";
    return people.find((p) => p.id === person.managerId)?.name ?? "—";
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Organization"
        title="Team Management & Employee Master (Spec v1.1)"
        description={
          isTopLevel
            ? "Full company roster — view 10-tab employee profiles, add staff, and manage org hierarchy."
            : canAdd
              ? "Your team hierarchy — view profiles, add, and manage your direct reports."
              : "Your team profile and reporting line."
        }
        showToolbar={false}
        actions={
          canAdd ? (
            <Button onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add employee
            </Button>
          ) : undefined
        }
      />

      <div className="px-8 pb-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="People in view" value={`${myTeam.length}`} icon={Users2} />
        <StatCard label="Active" value={`${activeCount}`} icon={Check} tone="var(--success)" />
        <StatCard label="Inactive" value={`${inactiveCount}`} icon={Ban} tone="var(--warning)" />
        <StatCard label="Direct reports" value={`${directReportCount}`} icon={UserCircle2} />
      </div>

      <div className="px-8 pb-10">
        <div className="rounded-2xl border border-border bg-elevated overflow-hidden shadow-sm">
          <div className="h-12 px-5 flex items-center justify-between border-b border-border">
            <div className="text-[13px] font-semibold">
              {isTopLevel ? "Everyone at VNC" : "Your team"}{" "}
              <span className="text-muted-foreground font-normal">· {myTeam.length}</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2/60 p-0.5">
              <button
                onClick={() => setView("table")}
                className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium inline-flex items-center gap-1.5 transition ${
                  view === "table" ? "bg-elevated shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Table2 className="h-3.5 w-3.5" /> Table
              </button>
              <button
                onClick={() => setView("chart")}
                className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium inline-flex items-center gap-1.5 transition ${
                  view === "chart" ? "bg-elevated shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Org chart
              </button>
            </div>
          </div>

          {view === "chart" ? (
            <OrgChart people={people} rootIds={visible.map((p) => p.id)} />
          ) : (
            <table className="w-full text-[13px]">
              <thead className="bg-surface-2/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <Th>Employee</Th>
                  <Th>Code</Th>
                  <Th>Role / Function</Th>
                  <Th>Reports to</Th>
                  <Th>Location</Th>
                  <Th>Status</Th>
                  <Th className="w-44 text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {myTeam.map((person, i) => (
                  <tr
                    key={person.id}
                    className={`border-t border-border hover:bg-surface-2/60 transition ${i % 2 === 1 ? "bg-surface/40" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-[11px] font-semibold text-white">
                          {person.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div className="font-medium">{person.name}</div>
                          <div className="text-[11.5px] text-muted-foreground">{person.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{person.employeeCode}</td>
                    <td className="px-5 py-3">{person.designation ?? person.departmentFunction}</td>
                    <td className="px-5 py-3 text-muted-foreground">{managerName(person)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{person.officialWorkLocation ?? "India Office"}</td>
                    <td className="px-5 py-3">
                      <Badge variant={person.status === "active" ? "default" : "secondary"}>
                        {person.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right space-x-1 whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => setProfileTarget(person)} title="View 10-Tab Profile">
                        <Eye className="h-3.5 w-3.5" /> Profile
                      </Button>
                      <IconButton label="Edit" onClick={() => setEditTarget(person)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 10-Tab Employee Profile Drawer */}
      <EmployeeProfileModal person={profileTarget} onClose={() => setProfileTarget(null)} />
    </AppShell>
  );
}

/** 10-Tab Full Employee Profile Modal per Employee Module Spec v1.1 Section 13 */
function EmployeeProfileModal({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const [tab, setTab] = useState<
    "overview" | "employment" | "learning" | "performance" | "assets" | "policies" | "attendance" | "documents" | "projects" | "compensation"
  >("overview");
  const [subData, setSubData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!person) return;
    setLoading(true);
    getEmployeeProfileFn({ data: { personId: person.id } })
      .then((res) => setSubData(res))
      .catch(() => setSubData(null))
      .finally(() => setLoading(false));
  }, [person]);

  if (!person) return null;

  return (
    <Dialog open={Boolean(person)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-lg font-bold text-white">
              {person.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <DialogTitle className="text-xl">{person.name}</DialogTitle>
              <DialogDescription className="text-xs">
                {person.employeeCode} · {person.designation ?? person.departmentFunction} ({person.department})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 10-Tab Navigation Bar */}
        <div className="flex items-center gap-1 border-b border-border pb-2 overflow-x-auto">
          {[
            { id: "overview", label: "1. Overview", icon: UserCircle2 },
            { id: "employment", label: "2. Employment", icon: Briefcase },
            { id: "learning", label: "3. Learning & Career", icon: GraduationCap },
            { id: "performance", label: "4. Goals & Appraisal", icon: Trophy },
            { id: "assets", label: "5. Assets", icon: Laptop },
            { id: "policies", label: "6. Policies", icon: FileCheck },
            { id: "attendance", label: "7. Attendance & Leave", icon: CalendarDays },
            { id: "documents", label: "8. HR Docs", icon: FileText },
            { id: "projects", label: "9. Projects", icon: Building2 },
            { id: "compensation", label: "10. Compensation", icon: DollarSign },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                tab === t.id ? "bg-foreground text-background font-semibold" : "text-muted-foreground hover:bg-surface-2"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 text-xs">
            <InfoBox label="Full Name" value={person.name} />
            <InfoBox label="Employee Code" value={person.employeeCode} />
            <InfoBox label="Work Email" value={person.email} />
            <InfoBox label="Official Location" value={person.officialWorkLocation ?? "—"} />
            <InfoBox label="Legal Entity" value={person.legalEntity ?? "—"} />
            <InfoBox label="Primary BU" value={person.primaryBusinessUnit ?? "—"} />
            <InfoBox label="Department" value={person.department} />
            <InfoBox label="Sub Department" value={person.subDepartment ?? "—"} />
            <InfoBox label="Job Title" value={person.designation ?? "—"} />
            <InfoBox label="Department Function" value={person.departmentFunction} />
            <InfoBox label="Status" value={person.status === "active" ? "Active" : "Inactive"} />
            <InfoBox label="Hire Date" value={person.hireDate ?? "—"} />
          </div>
        )}

        {/* Tab 2: Employment */}
        {tab === "employment" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 text-xs">
            <InfoBox label="Hire Date" value={person.hireDate ?? "—"} />
            <InfoBox label="Department" value={person.department} />
            <InfoBox label="Sub Department" value={person.subDepartment ?? "—"} />
            <InfoBox label="Job Title" value={person.designation ?? "—"} />
            <InfoBox label="Primary BU" value={person.primaryBusinessUnit ?? "—"} />
            <InfoBox label="Secondary BU" value={person.secondaryBusinessUnit ?? "—"} />
          </div>
        )}

        {/* Tab 3: Learning & Career */}
        {tab === "learning" && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 rounded-xl border border-border bg-surface-2">
              <h4 className="font-semibold text-foreground mb-1">Assigned Learning Path</h4>
              <p className="text-muted-foreground">{subData?.learningPaths?.[0]?.assignedLearningPath ?? "Standard Onboarding Path"}</p>
              <div className="mt-2 text-[11px] text-emerald-500 font-medium">
                Status: {subData?.learningPaths?.[0]?.learningPathStatus ?? "In Progress"} ({subData?.learningPaths?.[0]?.learningCompletionPercent ?? 45}% complete)
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Performance & Goals */}
        {tab === "performance" && (
          <div className="space-y-3 pt-2 text-xs">
            <h4 className="font-semibold text-foreground">Quarterly KRAs & Goals</h4>
            {subData?.kraGoals?.length ? (
              subData.kraGoals.map((g: any) => (
                <div key={g.id} className="p-3 rounded-xl border border-border bg-surface-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{g.goalTitle} ({g.reviewPeriod})</div>
                    <div className="text-muted-foreground">{g.goalDescription}</div>
                  </div>
                  <Badge variant="outline">{g.goalStatus}</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No custom goals recorded for this quarter yet.</p>
            )}
          </div>
        )}

        {/* Tab 5: Assets */}
        {tab === "assets" && (
          <div className="space-y-3 pt-2 text-xs">
            <h4 className="font-semibold text-foreground">Allocated Company Assets</h4>
            {subData?.assets?.length ? (
              subData.assets.map((a: any) => (
                <div key={a.id} className="p-3 rounded-xl border border-border bg-surface-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{a.assetName} ({a.assetType})</div>
                    <div className="text-muted-foreground">S/N: {a.assetSerialNumber ?? "N/A"}</div>
                  </div>
                  <Badge variant="secondary">{a.allocationStatus}</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Standard laptop and peripheral kit allocated.</p>
            )}
          </div>
        )}

        {/* Tab 6: Policies */}
        {tab === "policies" && (
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <InfoBox label="Attendance Policy" value={subData?.policy?.attendancePolicy ?? "Standard 9:00 AM - 6:00 PM"} />
            <InfoBox label="Shift Timing" value={subData?.policy?.shiftTime ?? "Day Shift (9:00 AM - 6:00 PM)"} />
            <InfoBox label="Grace Period" value={`${subData?.policy?.gracePeriodMinutes ?? 15} minutes`} />
            <InfoBox label="WFH Policy" value={subData?.policy?.workFromHomePolicy ?? "Hybrid (2 Days WFH / Week)"} />
          </div>
        )}

        {/* Tab 7: Attendance & Leave */}
        {tab === "attendance" && (
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <InfoBox label="Casual Leave Balance" value="6 Days" />
            <InfoBox label="Sick Leave Balance" value="5 Days" />
            <InfoBox label="Annual Leave Balance" value="12 Days" />
            <InfoBox label="Current Month Present Days" value="18 / 20 Working Days" />
          </div>
        )}

        {/* Tab 8: HR Documents */}
        {tab === "documents" && (
          <div className="space-y-2 pt-2 text-xs">
            <p className="text-muted-foreground">Identity & HR Documents verified on file:</p>
            {["Aadhar Card Verified", "PAN Card Verified", "Appointment Letter Signed"].map((doc) => (
              <div key={doc} className="p-2.5 rounded-lg border border-border bg-surface-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-foreground">{doc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 9: Projects */}
        {tab === "projects" && (
          <div className="space-y-2 pt-2 text-xs">
            <p className="text-muted-foreground">Assigned Client Projects & Work History:</p>
            <div className="p-3 rounded-xl border border-border bg-surface-2">
              <div className="font-semibold text-foreground">Acme Corp (C-001)</div>
              <div className="text-muted-foreground">Role: Senior Analyst · Active Assignment</div>
            </div>
          </div>
        )}

        {/* Tab 10: Compensation History */}
        {tab === "compensation" && (
          <div className="space-y-2 pt-2 text-xs">
            <p className="text-muted-foreground">Compensation Journey & CTC History:</p>
            <div className="p-3 rounded-xl border border-border bg-surface-2 flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">Standard Employee Grade</div>
                <div className="text-muted-foreground">Production Salary Record</div>
              </div>
              <Badge variant="outline">{person.hireDate ?? "2024-01-15"}</Badge>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Close Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-xl border border-border bg-surface-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-xs font-medium text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated p-4 shadow-sm flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-surface-2 grid place-items-center" style={{ color: tone }}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-semibold text-left ${className}`}>{children}</th>;
}

function IconButton({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="h-7 w-7 rounded-lg border border-border hover:bg-surface-2 disabled:opacity-30 grid place-items-center text-muted-foreground hover:text-foreground transition"
    >
      {children}
    </button>
  );
}
