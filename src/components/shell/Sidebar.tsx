import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserSquare2,
  UserPlus,
  GraduationCap,
  Trophy,
  BarChart3,
  FolderKanban,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Plus,
  Search,
  ChevronsLeft,
  ListChecks,
  CalendarDays,
  ClipboardCheck,
  FileEdit,
  History,
  Upload,
  Clock,
  Download,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getBootstrapFn } from "@/api/queries";
import { hasPermission } from "@/lib/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { label: string; icon: LucideIcon; to: string };
type NavGroup = { label: string; icon: LucideIcon; children: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

function flattenItems(entries: NavEntry[]): NavItem[] {
  return entries.flatMap((entry) => (isGroup(entry) ? entry.children : [entry]));
}

function filterAccessible(entries: NavEntry[], accessible: string[]): NavEntry[] {
  const result: NavEntry[] = [];
  for (const entry of entries) {
    if (isGroup(entry)) {
      const children = entry.children.filter((c) => accessible.includes(c.to));
      if (children.length > 0) result.push({ ...entry, children });
    } else if (accessible.includes(entry.to)) {
      result.push(entry);
    }
  }
  return result;
}

const primary: NavEntry[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "User Management", icon: Users, to: "/users" },
  {
    label: "Client",
    icon: Building2,
    children: [
      { label: "Clients", icon: Building2, to: "/clients" },
      { label: "Client Approvals", icon: ClipboardCheck, to: "/client-approvals" },
      { label: "Change Requests", icon: FileEdit, to: "/client-change-requests" },
      { label: "Import Center", icon: Upload, to: "/import-center" },
      { label: "Import History", icon: Clock, to: "/import-history" },
      { label: "Export Center", icon: Download, to: "/export-center" },
    ],
  },
  {
    label: "Employee",
    icon: UserSquare2,
    children: [
      { label: "Employees", icon: UserSquare2, to: "/teams" },
      { label: "Employee History", icon: History, to: "/employee-history" },
    ],
  },
  { label: "Tasks", icon: ListChecks, to: "/tasks" },
  { label: "Leave & Time Off", icon: CalendarDays, to: "/leave" },
  { label: "Permissions", icon: ShieldCheck, to: "/permission-management" },
];

const work: NavEntry[] = [
  { label: "Learning Hub", icon: GraduationCap, to: "/learning" },
  { label: "Performance", icon: Trophy, to: "/performance" },
  { label: "Reports Center", icon: BarChart3, to: "/reports" },
  { label: "Documents", icon: FolderKanban, to: "/documents" },
];

const FAVORITES_KEY = "vnc-hub-favorites";

function loadFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const FULL_ACCESS = [
  "/",
  "/users",
  "/clients",
  "/client-approvals",
  "/client-change-requests",
  "/teams",
  "/employee-history",
  "/import-center",
  "/import-history",
  "/export-center",
  "/tasks",
  "/leave",
  "/learning",
  "/performance",
  "/reports",
  "/documents",
  "/permission-management",
];

const BASE_ACCESS = ["/", "/tasks", "/leave", "/learning", "/performance", "/documents"];

/**
 * Enterprise permission-driven navigation resolution.
 * Evaluates route visibility dynamically against resolved effective user permissions map.
 */
function accessiblePages(
  person: { departmentFunction: string; isTeamLead: boolean; isBusinessUnitHead: boolean } | null,
  userPermissions: Record<string, boolean>,
): string[] {
  const pages = new Set<string>();

  // Evaluate via effective permission map when hydrated
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    if (
      hasPermission(userPermissions, "dashboard.view_exec") ||
      hasPermission(userPermissions, "dashboard.view_bu") ||
      hasPermission(userPermissions, "dashboard.view_team") ||
      hasPermission(userPermissions, "dashboard.view_personal")
    ) {
      pages.add("/");
    }

    if (hasPermission(userPermissions, "employee.view")) {
      pages.add("/users");
      pages.add("/teams");
      pages.add("/employee-history");
    }

    if (hasPermission(userPermissions, "client.view")) {
      pages.add("/clients");
      pages.add("/client-approvals");
      pages.add("/client-change-requests");
      pages.add("/import-center");
      pages.add("/import-history");
      pages.add("/export-center");
    }

    if (
      hasPermission(userPermissions, "task.view_own") ||
      hasPermission(userPermissions, "task.view_team") ||
      hasPermission(userPermissions, "task.view_all")
    ) {
      pages.add("/tasks");
    }

    if (
      hasPermission(userPermissions, "leave.apply") ||
      hasPermission(userPermissions, "leave.view_team") ||
      hasPermission(userPermissions, "leave.view_org")
    ) {
      pages.add("/leave");
    }

    pages.add("/learning");
    pages.add("/performance");

    if (hasPermission(userPermissions, "reports.view")) {
      pages.add("/reports");
    }

    if (
      hasPermission(userPermissions, "documents.download") ||
      hasPermission(userPermissions, "documents.upload")
    ) {
      pages.add("/documents");
    }

    if (hasPermission(userPermissions, "system.manage_permissions")) {
      pages.add("/permission-management");
    }

    return [...pages];
  }

  // Fallback initial hydration
  if (person) {
    if (person.departmentFunction === "Leadership") return FULL_ACCESS;
    if (person.isBusinessUnitHead) return FULL_ACCESS;
    if (person.departmentFunction === "Admin") {
      return FULL_ACCESS.filter((p) => !p.includes("client") && !p.includes("import") && !p.includes("export"));
    }
    return [...BASE_ACCESS];
  }

  return [];
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const bootstrapQuery = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrapFn() });
  const userPermissions = (bootstrapQuery.data as any)?.userPermissions ?? {};
  const accessible = accessiblePages(user, userPermissions);
  const visiblePrimary = filterAccessible(primary, accessible);
  const visibleWork = filterAccessible(work, accessible);
  const allNavItems = [...flattenItems(primary), ...flattenItems(work)];
  const favoriteItems = allNavItems.filter(
    (item) => favoriteIds.includes(item.to) && accessible.includes(item.to),
  );
  const addableItems = allNavItems.filter(
    (item) => accessible.includes(item.to) && !favoriteIds.includes(item.to),
  );

  useEffect(() => {
    setFavoriteIds(loadFavoriteIds());
  }, []);

  function toggleFavorite(to: string) {
    setFavoriteIds((prev) => {
      const next = prev.includes(to) ? prev.filter((id) => id !== to) : [...prev, to];
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <aside
      data-collapsed={collapsed}
      className="hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-300"
      style={{ width: collapsed ? 72 : 264 }}
    >
      <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
        <img
          src="/vnc-logo.png"
          alt="VNC logo"
          className="h-9 w-9 shrink-0 rounded-full shadow-sm ring-1 ring-border"
        />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
              VNC Hub
            </div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">Enterprise workspace</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition"
          aria-label="Collapse sidebar"
        >
          <ChevronsLeft
            className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <div className="px-3 pt-3">
        <button className="w-full h-9 flex items-center gap-2 px-2.5 rounded-lg bg-surface-2 border border-sidebar-border text-muted-foreground hover:text-foreground hover:border-border-strong transition text-[13px]">
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search…</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-6">
        <NavSection
          title="Workspace"
          items={visiblePrimary}
          collapsed={collapsed}
          pathname={pathname}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
        />
        <NavSection
          title="Modules"
          items={visibleWork}
          collapsed={collapsed}
          pathname={pathname}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
        />

        {!collapsed && (
          <div>
            <div className="px-3 mb-1.5 flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Favorites
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={addableItems.length === 0}
                    title="Add a favorite"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {addableItems.map((item) => (
                    <DropdownMenuItem
                      key={item.to}
                      onClick={() => toggleFavorite(item.to)}
                      className="gap-2"
                    >
                      <item.icon className="h-3.5 w-3.5" /> {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {favoriteItems.length === 0 ? (
              <p className="px-3 text-[11.5px] text-muted-foreground">
                Star a page to pin it here.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {favoriteItems.map((item) => (
                  <li key={item.to} className="group/fav relative">
                    <Link
                      to={item.to}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition"
                    >
                      <item.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{item.label}</span>
                    </Link>
                    <button
                      onClick={() => toggleFavorite(item.to)}
                      title="Remove from favorites"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/fav:opacity-100 transition text-muted-foreground hover:text-foreground"
                    >
                      <Star className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {user?.departmentFunction === "Leadership" ||
        user?.departmentFunction === "Admin" ||
        user?.isBusinessUnitHead ? (
          <div>
            <Link
              to="/ai-agents"
              className="mx-1 flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-border relative overflow-hidden group hover:border-border-strong transition"
            >
              <div className="absolute inset-0 bg-[image:var(--gradient-mesh)] opacity-100" />
              <div className="relative h-7 w-7 grid place-items-center rounded-lg bg-[image:var(--gradient-primary)]">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              {!collapsed && (
                <>
                  <div className="relative flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-foreground">AI Agent Center</div>
                    <div className="text-[10.5px] text-muted-foreground">Early access</div>
                  </div>
                  <span className="relative text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md bg-accent/10 text-foreground uppercase tracking-wider">
                    Preview
                  </span>
                </>
              )}
            </Link>
          </div>
        ) : null}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        <Link
          to="/settings"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent transition"
        >
          <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
          {!collapsed && <span className="text-[13px]">Settings</span>}
        </Link>
      </div>
    </aside>
  );
}

function NavSection({
  title,
  items,
  collapsed,
  pathname,
  favoriteIds,
  onToggleFavorite,
}: {
  title: string;
  items: NavEntry[];
  collapsed: boolean;
  pathname: string;
  favoriteIds: string[];
  onToggleFavorite: (to: string) => void;
}) {
  return (
    <div>
      {!collapsed && (
        <div className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map((entry) =>
          isGroup(entry) ? (
            <NavGroupRow
              key={entry.label}
              group={entry}
              collapsed={collapsed}
              pathname={pathname}
              favoriteIds={favoriteIds}
              onToggleFavorite={onToggleFavorite}
            />
          ) : (
            <NavItemRow
              key={entry.label}
              item={entry}
              collapsed={collapsed}
              pathname={pathname}
              favoriteIds={favoriteIds}
              onToggleFavorite={onToggleFavorite}
            />
          ),
        )}
      </ul>
    </div>
  );
}

function NavItemRow({
  item,
  collapsed,
  pathname,
  favoriteIds,
  onToggleFavorite,
  indent,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  favoriteIds: string[];
  onToggleFavorite: (to: string) => void;
  indent?: boolean;
}) {
  const active = pathname === item.to;
  const isFavorite = favoriteIds.includes(item.to);
  const Icon = item.icon;
  return (
    <li className="group/nav relative">
      <Link
        to={item.to}
        className={[
          "mx-1 flex items-center gap-3 py-2 rounded-lg text-[13px] transition relative",
          indent ? "pl-8 pr-2.5" : "px-2.5",
          active
            ? "bg-accent/10 text-foreground border border-accent/20 font-medium"
            : "text-sidebar-foreground/85 hover:bg-accent/10 hover:text-foreground",
        ].join(" ")}
      >
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[image:var(--gradient-primary)]" />
        )}
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      </Link>
      {!collapsed && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(item.to);
          }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${
            isFavorite
              ? "text-[color:var(--warning)]"
              : "opacity-0 group-hover/nav:opacity-100 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      )}
    </li>
  );
}

function NavGroupRow({
  group,
  collapsed,
  pathname,
  favoriteIds,
  onToggleFavorite,
}: {
  group: NavGroup;
  collapsed: boolean;
  pathname: string;
  favoriteIds: string[];
  onToggleFavorite: (to: string) => void;
}) {
  const childActive = group.children.some((c) => c.to === pathname);
  const [expanded, setExpanded] = useState(childActive);
  const Icon = group.icon;

  // Collapsed by default; auto-expand whenever the user is on one of this
  // group's pages (e.g. navigating there via a link, favorite, or URL).
  // Manual collapse/expand via the chevron is preserved otherwise.
  useEffect(() => {
    if (childActive) setExpanded(true);
  }, [childActive]);

  if (collapsed) {
    // Icon-only rail: no room for a submenu, so link straight to the first
    // child page (same behavior as every other icon-only nav entry).
    return (
      <NavItemRow
        item={{ label: group.label, icon: group.icon, to: group.children[0].to }}
        collapsed={collapsed}
        pathname={pathname}
        favoriteIds={favoriteIds}
        onToggleFavorite={onToggleFavorite}
      />
    );
  }

  return (
    <li>
      <button
        onClick={() => setExpanded((v) => !v)}
        className={[
          "w-full mx-1 flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] transition relative",
          childActive
            ? "text-foreground font-medium"
            : "text-sidebar-foreground/85 hover:bg-accent/10 hover:text-foreground",
        ].join(" ")}
        style={{ width: "calc(100% - 0.5rem)" }}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && (
        <ul className="mt-0.5 space-y-0.5">
          {group.children.map((child) => (
            <NavItemRow
              key={child.label}
              item={child}
              collapsed={collapsed}
              pathname={pathname}
              favoriteIds={favoriteIds}
              onToggleFavorite={onToggleFavorite}
              indent
            />
          ))}
        </ul>
      )}
    </li>
  );
}
