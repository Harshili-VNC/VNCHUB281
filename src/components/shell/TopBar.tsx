import { useEffect, useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CalendarPlus,
  ChevronDown,
  Command,
  HelpCircle,
  ListChecks,
  LogOut,
  Plus,
  Search,
  Settings,
  UserPlus,
} from "lucide-react";
import { useAuth, getDirectReports, canAddPeople } from "@/lib/auth";
import { useWorkspace, tasksDueToday, pendingLeaveForApprover } from "@/lib/workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const labels: Record<string, string> = {
  "": "Dashboard",
  users: "User Management",
  clients: "Client Management",
  teams: "Team Management",
  tasks: "Tasks",
  leave: "Leave & Time Off",
  recruitment: "Recruitment",
  learning: "Learning Hub",
  performance: "Performance",
  reports: "Reports Center",
  documents: "Documents",
  settings: "Settings",
  "ai-agents": "AI Agent Center",
};

export function TopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, people, signOut } = useAuth();
  const { tasks, leaveRequests } = useWorkspace();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const seg = pathname.replace(/^\//, "").split("/")[0] ?? "";
  const current = labels[seg] ?? "Dashboard";
  const initials = user?.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  const reports = user ? getDirectReports(people, user.id) : [];
  const canAssignTask = reports.length > 0;
  const canAddPerson = user ? canAddPeople(user) : false;
  const canRequestLeave = Boolean(user?.managerId);

  const dueToday = user ? tasksDueToday(tasks, user.id) : [];
  const pendingApprovals = user ? pendingLeaveForApprover(leaveRequests, user.id) : [];
  const notificationCount = dueToday.length + pendingApprovals.length;

  function personName(id: string) {
    return people.find((p) => p.id === id)?.name ?? "—";
  }

  function goTo(path: string) {
    setPaletteOpen(false);
    navigate({ to: path });
  }

  return (
    <header className="h-16 shrink-0 flex items-center border-b border-border bg-background/75 backdrop-blur-xl sticky top-0 z-30">
      <button className="h-full flex items-center gap-2.5 px-6 border-r border-border hover:bg-surface-2 transition">
        <img src="/vnc-global-logo.svg" alt="VNC logo" className="h-6 w-6 rounded-full" />
        <span className="text-[13px] font-medium text-foreground">VNC · Enterprise</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-2 px-5 min-w-0">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <nav className="hidden lg:flex items-center gap-2 text-[13px] text-muted-foreground min-w-0">
          <span>Workspace</span>
          <span className="opacity-40">/</span>
          <span className="text-foreground font-medium truncate">{current}</span>
        </nav>
      </div>

      <div className="flex-1 flex justify-center px-6 min-w-0">
        <button
          onClick={() => setPaletteOpen(true)}
          className="w-full max-w-xl h-9 flex items-center gap-2.5 px-3 rounded-lg bg-surface-2 border border-border hover:border-border-strong text-muted-foreground text-[13px] transition"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left truncate">
            Search clients, employees, projects, docs…
          </span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border shrink-0">
            <Command className="h-2.5 w-2.5 inline -mt-0.5" />K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 px-3 rounded-lg text-[13px] font-medium bg-[image:var(--gradient-primary)] text-white shadow-glow inline-flex items-center gap-1.5 hover:opacity-95 transition">
              <Plus className="h-3.5 w-3.5" />
              Create
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick create</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canAssignTask && (
              <DropdownMenuItem onClick={() => goTo("/tasks")} className="gap-2">
                <ListChecks className="h-3.5 w-3.5" /> New task
              </DropdownMenuItem>
            )}
            {canAddPerson && (
              <DropdownMenuItem onClick={() => goTo("/teams")} className="gap-2">
                <UserPlus className="h-3.5 w-3.5" /> New employee
              </DropdownMenuItem>
            )}
            {canRequestLeave && (
              <DropdownMenuItem onClick={() => goTo("/leave")} className="gap-2">
                <CalendarPlus className="h-3.5 w-3.5" /> Request leave
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative h-9 w-9 grid place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground transition">
              <HelpCircle className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Keyboard shortcuts</DropdownMenuLabel>
            <div className="px-2 py-1.5 flex items-center justify-between text-[12.5px]">
              <span className="text-muted-foreground">Open search</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border">
                <Command className="h-2.5 w-2.5 inline -mt-0.5" />K
              </kbd>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Quick links</DropdownMenuLabel>
            {canAssignTask && (
              <DropdownMenuItem onClick={() => goTo("/tasks")} className="gap-2">
                <ListChecks className="h-3.5 w-3.5" /> Tasks
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => goTo("/leave")} className="gap-2">
              <CalendarPlus className="h-3.5 w-3.5" /> Leave & Time Off
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => goTo("/teams")} className="gap-2">
              <UserPlus className="h-3.5 w-3.5" /> Team Management
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <a href="mailto:support@vnc.com" className="block">
              <DropdownMenuItem className="gap-2">
                <HelpCircle className="h-3.5 w-3.5" /> Contact support
              </DropdownMenuItem>
            </a>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative h-9 w-9 grid place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground transition">
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-danger text-[9px] font-semibold text-white grid place-items-center ring-2 ring-background">
                  {notificationCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationCount === 0 ? (
              <div className="px-2 py-4 text-center text-[12.5px] text-muted-foreground">
                You're all caught up.
              </div>
            ) : (
              <>
                {pendingApprovals.slice(0, 4).map((request) => (
                  <DropdownMenuItem
                    key={request.id}
                    onClick={() => goTo("/leave")}
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="text-[12.5px]">
                      <span className="font-medium">{personName(request.personId)}</span> is asking
                      for leave
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {request.startDate} → {request.endDate}
                    </span>
                  </DropdownMenuItem>
                ))}
                {dueToday.slice(0, 4).map((task) => (
                  <DropdownMenuItem
                    key={task.id}
                    onClick={() => goTo("/tasks")}
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="text-[12.5px] font-medium">{task.title}</span>
                    <span className="text-[11px] text-muted-foreground">Due {task.dueDate}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-5 w-px bg-border mx-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2 h-9 rounded-lg hover:bg-surface-2 transition">
              <div className="h-7 w-7 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-[11px] font-semibold text-white ring-2 ring-background">
                {initials}
              </div>
              <div className="hidden xl:block text-left leading-tight">
                <div className="text-[12.5px] font-medium">{user?.name}</div>
                <div className="text-[10.5px] text-muted-foreground">
                  {user?.designation ?? user?.departmentFunction}
                </div>
              </div>
              <ChevronDown className="hidden xl:block h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="font-medium">{user?.name}</div>
              <div className="text-[11px] font-normal text-muted-foreground">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => goTo("/settings")} className="gap-2">
              <Settings className="h-3.5 w-3.5" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                navigate({ to: "/login", replace: true });
              }}
              className="gap-2 text-danger focus:text-danger"
            >
              <LogOut className="h-3.5 w-3.5" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SearchPalette open={paletteOpen} onOpenChange={setPaletteOpen} onNavigate={goTo} />
    </header>
  );
}

function SearchPalette({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (path: string) => void;
}) {
  const { people } = useAuth();
  const { tasks } = useWorkspace();

  const peopleResults = useMemo(() => people.slice(0, 25), [people]);
  const taskResults = useMemo(() => tasks.slice(0, 25), [tasks]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search people, tasks, clients…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="People">
          {peopleResults.map((person) => (
            <CommandItem
              key={person.id}
              value={`${person.name} ${person.email} ${person.designation ?? person.departmentFunction} ${person.department}`}
              onSelect={() => onNavigate("/teams")}
            >
              <span className="font-medium">{person.name}</span>
              <span className="text-muted-foreground">
                · {person.designation ?? person.departmentFunction} · {person.department}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Tasks">
          {taskResults.map((task) => (
            <CommandItem key={task.id} value={task.title} onSelect={() => onNavigate("/tasks")}>
              {task.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Clients">
          <CommandItem value="clients" onSelect={() => onNavigate("/clients")}>
            Open Client Management
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
