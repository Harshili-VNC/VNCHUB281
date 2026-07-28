import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Person } from "@/lib/auth";

const departmentFunctionAccentClass: Record<string, string> = {
  Leadership: "border-l-[color:var(--purple)]",
  Admin: "border-l-[color:var(--purple)]",
  Finance: "border-l-[color:var(--primary)]",
  HR: "border-l-[color:var(--emerald)]",
  Marketing: "border-l-[color:var(--teal)]",
  Operations: "border-l-[color:var(--primary)]",
  "IT / Systems": "border-l-[color:var(--primary)]",
};

/**
 * Renders the reporting structure as a nested dropdown tree, so it's visually obvious
 * who reports to whom. `rootIds` are the top-of-tree people to start from.
 */
export function OrgChart({ people, rootIds }: { people: Person[]; rootIds: string[] }) {
  const childrenByManager = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const person of people) {
      if (!person.managerId) continue;
      const siblings = map.get(person.managerId) ?? [];
      siblings.push(person);
      map.set(person.managerId, siblings);
    }
    for (const siblings of map.values()) {
      siblings.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [people]);

  const roots = people.filter(
    (p) => rootIds.includes(p.id) && (!p.managerId || !rootIds.includes(p.managerId)),
  );

  if (roots.length === 0) {
    return (
      <div className="px-5 py-14 text-center text-[13px] text-muted-foreground">
        Nothing to chart yet.
      </div>
    );
  }

  return (
    <div className="px-5 py-5 space-y-1">
      {roots.map((root) => (
        <OrgNode key={root.id} person={root} childrenByManager={childrenByManager} depth={0} />
      ))}
    </div>
  );
}

function OrgNode({
  person,
  childrenByManager,
  depth,
}: {
  person: Person;
  childrenByManager: Map<string, Person[]>;
  depth: number;
}) {
  const reports = childrenByManager.get(person.id) ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const accent = departmentFunctionAccentClass[person.departmentFunction] ?? "border-l-border";
  const hasReports = reports.length > 0;
  const rowClassName = `flex w-full items-center gap-3 rounded-lg border border-border border-l-[3px] ${accent} bg-surface/60 px-3 py-2 my-1 text-left transition-colors hover:bg-elevated ${
    person.status === "inactive" ? "opacity-60" : ""
  }`;
  const personSummary = (
    <>
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-[10.5px] font-semibold text-white">
        {person.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium">
          {person.name}
          {hasReports && (
            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
              {reports.length} direct report{reports.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {person.designation ?? person.departmentFunction} · {person.department}
          {person.isBusinessUnitHead ? " · BU Head" : ""}
          {person.isTeamLead ? " · Team Lead" : ""}
          {person.status === "inactive" ? " · Deactivated" : ""}
        </div>
      </div>
    </>
  );

  return (
    <div className={depth > 0 ? "ml-5 border-l border-border pl-4" : ""}>
      {hasReports ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className={rowClassName}>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
                isOpen ? "" : "-rotate-90"
              }`}
            />
            {personSummary}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {reports.map((report) => (
              <OrgNode
                key={report.id}
                person={report}
                childrenByManager={childrenByManager}
                depth={depth + 1}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className={rowClassName}>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-50" />
          {personSummary}
        </div>
      )}
    </div>
  );
}
