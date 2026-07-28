import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  Database,
  UserCheck,
  GraduationCap,
  Trophy,
  Laptop,
  FileCheck,
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Sliders,
  Shield,
  Palette,
  Bell,
  Globe,
  KeyRound,
  Plug,
} from "lucide-react";
import {
  employmentStatusEnum,
  nonActiveEmployeeReasons,
  officialWorkLocations,
  employeeCategories,
  roleTags,
  nonActiveClientReasons,
  legalStructures,
  industryCodes,
  revenueBands,
  employeeSizeBands,
  companyAssetTypes,
  personalAssetTypes,
  softwareCategories,
} from "@/lib/documents";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Master Data · VNC Global" },
      { name: "description", content: "Workspace configuration, security, and Master Data Management." },
    ],
  }),
  component: SettingsPage,
});

type MasterCategory = {
  id: string;
  title: string;
  group: string;
  description: string;
  icon: any;
  items: string[];
};

const defaultMasters: MasterCategory[] = [
  {
    id: "emp-types",
    title: "Employment Types",
    group: "Employee Master",
    description: "Supported employment contracts across the organization.",
    icon: UserCheck,
    items: ["Full Time", "Part Time", "Contract", "Intern"],
  },
  {
    id: "work-locations",
    title: "Work Locations",
    group: "Employee Master",
    description: "Official physical or remote work locations.",
    icon: UserCheck,
    items: officialWorkLocations,
  },
  {
    id: "emp-categories",
    title: "Employee Categories",
    group: "Employee Master",
    description: "Cost allocation categories (Billable vs Non-Billable).",
    icon: UserCheck,
    items: employeeCategories,
  },
  {
    id: "role-tags",
    title: "Role Tags",
    group: "Employee Master",
    description: "Tags assigned to employees for skill & project allocation.",
    icon: UserCheck,
    items: roleTags,
  },
  {
    id: "non-active-emp",
    title: "Non-Active Employee Reasons",
    group: "Employee Master",
    description: "Standard reasons selectable when deactivating an employee account.",
    icon: UserCheck,
    items: nonActiveEmployeeReasons,
  },
  {
    id: "learning-cats",
    title: "Learning Categories",
    group: "Learning & Career",
    description: "Categories for training modules & courses.",
    icon: GraduationCap,
    items: ["Software Learning", "Soft Skills Learning", "Technical Skills Learning"],
  },
  {
    id: "recog-types",
    title: "Recognition Types",
    group: "Performance & Growth",
    description: "Standard recognition & award types.",
    icon: Trophy,
    items: ["Certificate", "Appreciation", "Award", "Spot Recognition"],
  },
  {
    id: "asset-types",
    title: "Company Asset Types",
    group: "Asset Management",
    description: "Hardware & equipment types allocated to staff.",
    icon: Laptop,
    items: companyAssetTypes,
  },
  {
    id: "personal-asset-types",
    title: "Personal WFH Asset Types",
    group: "Asset Management",
    description: "Personal equipment tracked for WFH readiness.",
    icon: Laptop,
    items: personalAssetTypes,
  },
  {
    id: "policies-master",
    title: "Policy Templates",
    group: "Policies",
    description: "Standard attendance, leave, WFH, and travel policy templates.",
    icon: FileCheck,
    items: ["Standard 9-to-6 Shift", "Flexible Hours Policy", "Standard Leave Policy", "Hybrid WFH Policy", "Travel & Expense Policy"],
  },
  {
    id: "legal-structs",
    title: "Account Legal Structures",
    group: "Client Master",
    description: "Legal entity structures for client accounts.",
    icon: Building2,
    items: legalStructures,
  },
  {
    id: "industry-codes",
    title: "Industry Codes",
    group: "Client Master",
    description: "Industry categories for client profiling.",
    icon: Building2,
    items: industryCodes,
  },
  {
    id: "revenue-bands",
    title: "Revenue Bands",
    group: "Client Master",
    description: "Client annual revenue classification bands.",
    icon: Building2,
    items: revenueBands,
  },
  {
    id: "employee-size-bands",
    title: "Employee Size Bands",
    group: "Client Master",
    description: "Client company employee count bands.",
    icon: Building2,
    items: employeeSizeBands,
  },
  {
    id: "non-active-client",
    title: "Non-Active Client Reasons",
    group: "Client Master",
    description: "Standardized exit/offboarding reasons for clients.",
    icon: Building2,
    items: nonActiveClientReasons,
  },
];

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"masters" | "general">("masters");
  const [selectedGroup, setSelectedGroup] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [masters, setMasters] = useState<MasterCategory[]>(defaultMasters);
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [newValueText, setNewValueText] = useState("");

  const groups = ["All", "Employee Master", "Client Master", "Learning & Career", "Performance & Growth", "Asset Management", "Policies"];

  const filteredMasters = masters.filter((m) => {
    const matchesGroup = selectedGroup === "All" || m.group === selectedGroup;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.items.some((item) => item.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGroup && matchesSearch;
  });

  function handleAddItem(categoryId: string) {
    if (!newValueText.trim()) return;
    setMasters((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId && !cat.items.includes(newValueText.trim())) {
          return { ...cat, items: [...cat.items, newValueText.trim()] };
        }
        return cat;
      }),
    );
    setNewValueText("");
    setAddingToId(null);
  }

  return (
    <AppShell showRightPanel={false}>
      <PageHeader
        eyebrow="Workspace Configuration"
        title="Settings & Master Data Management"
        description="Manage system-wide dropdown master lists, operational policies, and workspace preferences."
        showToolbar={false}
      />

      <div className="px-8 pb-10 space-y-6">
        {/* Sub-nav tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab("masters")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
              activeTab === "masters"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <Database className="h-4 w-4" /> Dynamic Master Data (Sections 15 & 16)
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
              activeTab === "general"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <Sliders className="h-4 w-4" /> Workspace Preferences
          </button>
        </div>

        {activeTab === "masters" ? (
          <div className="space-y-6">
            {/* Header description banner */}
            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-foreground">Dynamic Master Data Management</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Per <strong>VNC Hub Specification (Sections 15 & 16)</strong>, no business-critical dropdown across Client Master or Employee Module is hardcoded. Admins can add, manage, and extend master categories here dynamically.
                </p>
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {groups.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                      selectedGroup === g
                        ? "bg-surface-3 text-foreground font-semibold border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search master lists…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-2 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>

            {/* Master Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMasters.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-surface-2 grid place-items-center text-foreground">
                          <cat.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{cat.title}</h3>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-2 text-muted-foreground">
                            {cat.group}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setAddingToId(addingToId === cat.id ? null : cat.id)}
                        className="h-7 w-7 rounded-lg border border-border hover:bg-surface-2 grid place-items-center text-muted-foreground hover:text-foreground transition"
                        title="Add Master Value"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">{cat.description}</p>

                    {/* Add new input line */}
                    {addingToId === cat.id && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="New value name…"
                          value={newValueText}
                          onChange={(e) => setNewValueText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddItem(cat.id)}
                          className="flex-1 h-8 px-2.5 rounded-lg bg-surface-2 border border-border text-xs focus:outline-none"
                        />
                        <button
                          onClick={() => handleAddItem(cat.id)}
                          className="h-8 px-3 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    {/* Value chips */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {cat.items.map((item) => (
                        <span
                          key={item}
                          className="text-xs px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-foreground font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{cat.items.length} dynamic options</span>
                    <span className="text-emerald-500 font-medium">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              { title: "Security", icon: Shield, desc: "Passwords, MFA, and session management." },
              { title: "API Keys", icon: KeyRound, desc: "Programmatic access & webhooks." },
              { title: "Notifications", icon: Bell, desc: "Email and in-app alerts." },
              { title: "Appearance", icon: Palette, desc: "Theme and density preferences." },
              { title: "Localization", icon: Globe, desc: "Timezone and currency formatting." },
              { title: "Integrations", icon: Plug, desc: "Xero, QBO, Slack, and HRIS sync." },
            ].map((g) => (
              <div key={g.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-border-strong transition">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-surface-2 grid place-items-center text-foreground">
                    <g.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{g.title}</div>
                    <div className="text-xs text-muted-foreground">{g.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
