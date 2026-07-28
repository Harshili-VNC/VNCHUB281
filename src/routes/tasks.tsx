import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, ClipboardList, ListChecks, Plus, PlayCircle } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { useAuth, getDirectReports, getVisiblePeople } from "@/lib/auth";
import {
  useWorkspace,
  tasksAssignedToMe,
  tasksWithinBranch,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks · VNC Global" },
      { name: "description", content: "Create, assign, and track tasks across your team." },
      { property: "og:title", content: "Tasks · VNC Global" },
      { property: "og:description", content: "Task assignment and tracking scoped to your role." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksPage,
});

const priorityTone: Record<TaskPriority, string> = {
  low: "bg-[color:var(--teal)]/12 text-[color:var(--teal)]",
  medium: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  high: "bg-[color:var(--danger)]/12 text-[color:var(--danger)]",
};

const statusMeta: Record<TaskStatus, { label: string; tone: string }> = {
  todo: { label: "To do", tone: "bg-surface-2 text-muted-foreground" },
  in_progress: {
    label: "In progress",
    tone: "bg-[color:var(--primary)]/12 text-[color:var(--primary)]",
  },
  done: { label: "Done", tone: "bg-[color:var(--success)]/12 text-[color:var(--success)]" },
};

function TasksPage() {
  const { user, people } = useAuth();
  const { tasks, setTaskStatus } = useWorkspace();
  const [addOpen, setAddOpen] = useState(false);

  if (!user) return null;

  const reports = getDirectReports(people, user.id);
  const canAssign = reports.length > 0;
  const showMyTasks = user.departmentFunction !== "Leadership";

  const myTasks = tasksAssignedToMe(tasks, user.id);
  const branchIds = new Set(getVisiblePeople(people, user).map((p) => p.id));
  const teamTasks = tasksWithinBranch(tasks, branchIds);

  function personName(id: string) {
    return people.find((p) => p.id === id)?.name ?? "—";
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    const result = await setTaskStatus(task.id, status);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${task.title}" marked ${statusMeta[status].label.toLowerCase()}`);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Workspace"
        title="Tasks"
        description={
          user.departmentFunction === "Leadership" || user.departmentFunction === "Admin"
            ? "Assign work to your Managers and track everything happening across the company."
            : canAssign
              ? "Create tasks for your direct reports and see everything happening across your team."
              : "Your assigned tasks."
        }
        showToolbar={false}
        actions={
          canAssign ? (
            <Button onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> New task
            </Button>
          ) : undefined
        }
      />

      <div className="px-8 pb-10 space-y-8">
        {showMyTasks && (
          <section>
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
              <ListChecks className="h-4 w-4 text-muted-foreground" /> My tasks
              <span className="text-muted-foreground font-normal">· {myTasks.length}</span>
            </div>
            {myTasks.length === 0 ? (
              <EmptyState text="Nothing assigned to you right now." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-border bg-elevated p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        className={`${priorityTone[task.priority]} border-transparent capitalize`}
                      >
                        {task.priority}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`${statusMeta[task.status].tone} border-transparent`}
                      >
                        {statusMeta[task.status].label}
                      </Badge>
                    </div>
                    <div className="mt-3 text-[13.5px] font-semibold leading-snug">
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="mt-1 text-[12px] text-muted-foreground leading-5">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-3 text-[11px] text-muted-foreground">
                      Due {task.dueDate} · from {personName(task.assignerId)}
                    </div>
                    <div className="mt-4 flex gap-2">
                      {task.status === "todo" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => handleStatusChange(task, "in_progress")}
                        >
                          <PlayCircle className="h-3.5 w-3.5" /> Start
                        </Button>
                      )}
                      {task.status === "in_progress" && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleStatusChange(task, "done")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark complete
                        </Button>
                      )}
                      {task.status === "done" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5"
                          onClick={() => handleStatusChange(task, "todo")}
                        >
                          <Circle className="h-3.5 w-3.5" /> Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {canAssign && (
          <section>
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
              <ClipboardList className="h-4 w-4 text-muted-foreground" /> My team's tasks
              <span className="text-muted-foreground font-normal">· {teamTasks.length}</span>
            </div>
            {teamTasks.length === 0 ? (
              <EmptyState text="No tasks have been created within your team yet." />
            ) : (
              <div className="rounded-2xl border border-border bg-elevated overflow-hidden shadow-sm">
                <table className="w-full text-[13px]">
                  <thead className="bg-surface-2/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <Th>Task</Th>
                      <Th>Assigned by</Th>
                      <Th>Assigned to</Th>
                      <Th>Priority</Th>
                      <Th>Due</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamTasks.map((task, i) => (
                      <tr
                        key={task.id}
                        className={`border-t border-border ${i % 2 === 1 ? "bg-surface/40" : ""}`}
                      >
                        <td className="px-5 py-3 font-medium">{task.title}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {personName(task.assignerId)}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {personName(task.assigneeId)}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            className={`${priorityTone[task.priority]} border-transparent capitalize`}
                          >
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground num">{task.dueDate}</td>
                        <td className="px-5 py-3">
                          <Badge
                            variant="secondary"
                            className={`${statusMeta[task.status].tone} border-transparent`}
                          >
                            {statusMeta[task.status].label}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {canAssign && <AddTaskDialog open={addOpen} onOpenChange={setAddOpen} reports={reports} />}
    </AppShell>
  );
}

function AddTaskDialog({
  open,
  onOpenChange,
  reports,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: ReturnType<typeof getDirectReports>;
}) {
  const { addTask } = useWorkspace();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setAssigneeId("");
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!assigneeId) {
      setError("Choose who this task goes to.");
      return;
    }
    const result = await addTask({ title, description, priority, dueDate, assigneeId });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Task assigned");
    reset();
    onOpenChange(false);
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
          <DialogTitle>Create a new task</DialogTitle>
          <DialogDescription>Assign it to one of your direct reports.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Review client process doc"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any detail that helps them get started"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assign to</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a direct report" />
              </SelectTrigger>
              <SelectContent>
                {reports.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name} · {person.designation ?? person.departmentFunction}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit">Assign task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-10 text-center text-[13px] text-muted-foreground">
      {text}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-semibold px-5 py-3">{children}</th>;
}
