export type PermissionCategory =
  | "Employee Master"
  | "Client Master"
  | "Task Module"
  | "Leave Module"
  | "Dashboard"
  | "Reports"
  | "Documents"
  | "System";

export type PermissionDefinition = {
  id: string;
  category: PermissionCategory;
  name: string;
  description: string;
};

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  "Employee Master",
  "Client Master",
  "Task Module",
  "Leave Module",
  "Dashboard",
  "Reports",
  "Documents",
  "System",
];

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // --- Employee Master ---
  { id: "employee.view", category: "Employee Master", name: "View Employees", description: "View employee profiles and organizational list" },
  { id: "employee.create", category: "Employee Master", name: "Create Employee", description: "Add new employee records to the master database" },
  { id: "employee.edit", category: "Employee Master", name: "Edit Employee", description: "Modify existing employee details and records" },
  { id: "employee.deactivate", category: "Employee Master", name: "Deactivate Employee", description: "Mark employee status as inactive or non-active" },
  { id: "employee.import", category: "Employee Master", name: "Import Employees", description: "Bulk import employees via CSV/Excel" },
  { id: "employee.export", category: "Employee Master", name: "Export Employees", description: "Export employee master data" },
  { id: "employee.assign_manager", category: "Employee Master", name: "Assign Reporting Manager", description: "Set or reassign reporting manager hierarchy" },
  { id: "employee.view_history", category: "Employee Master", name: "View Employee History", description: "Access audit logs of employee changes" },
  { id: "employee.view_salary", category: "Employee Master", name: "View Salary Information", description: "Access compensation and financial records" },
  { id: "employee.view_docs", category: "Employee Master", name: "View Documents", description: "Access HR and identity documents" },
  { id: "employee.edit_docs", category: "Employee Master", name: "Edit Documents", description: "Upload and update HR documents" },

  // --- Client Master ---
  { id: "client.view", category: "Client Master", name: "View Clients", description: "Access client master records and Client360" },
  { id: "client.create", category: "Client Master", name: "Create Client", description: "Create new client onboarding profiles" },
  { id: "client.edit", category: "Client Master", name: "Edit Client", description: "Edit client master details" },
  { id: "client.delete", category: "Client Master", name: "Delete Client", description: "Deactivate or delete client entries" },
  { id: "client.approve", category: "Client Master", name: "Approve Client", description: "Approve client creation & change requests" },
  { id: "client.reject", category: "Client Master", name: "Reject Client", description: "Reject client creation & change requests" },
  { id: "client.send_back", category: "Client Master", name: "Send Back Client", description: "Send back client records for correction" },
  { id: "client.import", category: "Client Master", name: "Import Clients", description: "Bulk import client records" },
  { id: "client.export", category: "Client Master", name: "Export Clients", description: "Export client master data" },
  { id: "client.view_history", category: "Client Master", name: "View Client History", description: "View client change audit trail" },
  { id: "client.manage_software", category: "Client Master", name: "Manage Software Stack", description: "Configure client software applications & URLs" },
  { id: "client.manage_contacts", category: "Client Master", name: "Manage Contacts", description: "Add/edit client contacts" },
  { id: "client.manage_accounts", category: "Client Master", name: "Manage Accounts", description: "Configure client legal accounts" },

  // --- Task Module ---
  { id: "task.create", category: "Task Module", name: "Create Tasks", description: "Create new tasks for self or team" },
  { id: "task.assign", category: "Task Module", name: "Assign Tasks", description: "Assign tasks to team members" },
  { id: "task.reassign", category: "Task Module", name: "Reassign Tasks", description: "Change task assignees" },
  { id: "task.close", category: "Task Module", name: "Close Tasks", description: "Mark tasks as completed" },
  { id: "task.delete", category: "Task Module", name: "Delete Tasks", description: "Delete task records" },
  { id: "task.view_all", category: "Task Module", name: "View All Tasks", description: "View company-wide task activity" },
  { id: "task.view_team", category: "Task Module", name: "View Team Tasks", description: "View tasks assigned to direct team" },
  { id: "task.view_own", category: "Task Module", name: "View Own Tasks", description: "View personal tasks" },

  // --- Leave Module ---
  { id: "leave.approve", category: "Leave Module", name: "Approve Leave", description: "Approve team leave requests" },
  { id: "leave.reject", category: "Leave Module", name: "Reject Leave", description: "Reject team leave requests" },
  { id: "leave.apply", category: "Leave Module", name: "Apply Leave", description: "Submit personal leave requests" },
  { id: "leave.view_team", category: "Leave Module", name: "View Team Leave", description: "View team leave calendar & status" },
  { id: "leave.view_org", category: "Leave Module", name: "View Organization Leave", description: "View organization-wide leave schedule" },

  // --- Dashboard ---
  { id: "dashboard.view_exec", category: "Dashboard", name: "View Executive Dashboard", description: "Access C-Suite executive analytics" },
  { id: "dashboard.view_bu", category: "Dashboard", name: "View BU Dashboard", description: "Access Business Unit metrics" },
  { id: "dashboard.view_team", category: "Dashboard", name: "View Team Dashboard", description: "Access team performance metrics" },
  { id: "dashboard.view_personal", category: "Dashboard", name: "View Personal Dashboard", description: "Access personal work overview" },

  // --- Reports ---
  { id: "reports.view", category: "Reports", name: "View Reports", description: "View business and operational reports" },
  { id: "reports.export", category: "Reports", name: "Export Reports", description: "Export report datasets" },
  { id: "reports.create", category: "Reports", name: "Create Reports", description: "Build custom report templates" },
  { id: "reports.delete", category: "Reports", name: "Delete Reports", description: "Delete report templates" },

  // --- Documents ---
  { id: "documents.upload", category: "Documents", name: "Upload Documents", description: "Upload central documents" },
  { id: "documents.delete", category: "Documents", name: "Delete Documents", description: "Delete central documents" },
  { id: "documents.edit", category: "Documents", name: "Edit Documents", description: "Modify document metadata" },
  { id: "documents.download", category: "Documents", name: "Download Documents", description: "Download central document files" },

  // --- System ---
  { id: "system.manage_permissions", category: "System", name: "Manage Permissions", description: "Configure enterprise permission matrix" },
  { id: "system.manage_departments", category: "System", name: "Manage Departments", description: "Configure organizational departments" },
  { id: "system.manage_designations", category: "System", name: "Manage Designations", description: "Configure job titles & designation hierarchy" },
  { id: "system.manage_roles", category: "System", name: "Manage Roles", description: "Configure access control roles" },
  { id: "system.manage_bus", category: "System", name: "Manage Business Units", description: "Configure business units & legal entities" },
  { id: "system.manage_masters", category: "System", name: "Manage Masters", description: "Configure global system dropdown master data" },
  { id: "system.import_data", category: "System", name: "Import Data", description: "Access data import utilities" },
  { id: "system.export_data", category: "System", name: "Export Data", description: "Access data export center" },
  { id: "system.settings", category: "System", name: "System Settings", description: "Configure core system settings" },
  { id: "system.audit_logs", category: "System", name: "Audit Logs", description: "Access enterprise audit history" },
];

/**
 * Computes default permission map for a designation ID so the initial seed
 * preserves existing privileges 100%.
 */
export function getDefaultPermissionsForDesignation(designationIdOrName: string): Record<string, boolean> {
  const norm = designationIdOrName.toLowerCase();
  const isCeoOrMd = norm.includes("ceo") || norm.includes("managing");
  const isAdmin = norm.includes("admin") || norm.includes("sysadmin") || norm.includes("it admin");
  const isBUHead = norm.includes("head") || norm.includes("business-unit") || norm.includes("finance") || norm.includes("marketing");
  const isTeamLead = norm.includes("lead") || norm.includes("assistant");

  const defaults: Record<string, boolean> = {};

  for (const perm of ALL_PERMISSIONS) {
    if (isCeoOrMd) {
      defaults[perm.id] = true;
    } else if (isAdmin) {
      // IT Admin has full system & user access, but ZERO client permissions
      defaults[perm.id] = !perm.id.startsWith("client.");
    } else if (isBUHead) {
      // BU Heads & Department Heads get full domain access except system admin permissions
      defaults[perm.id] = perm.category !== "System" || perm.id === "system.export_data" || perm.id === "system.import_data";
    } else if (isTeamLead) {
      // Team leads get team management, view, task, leave approval
      defaults[perm.id] =
        perm.id.startsWith("employee.view") ||
        perm.id.startsWith("client.view") ||
        perm.id.startsWith("task.") ||
        perm.id.startsWith("leave.") ||
        perm.id.startsWith("documents.") ||
        perm.id === "dashboard.view_team" ||
        perm.id === "dashboard.view_personal" ||
        perm.id === "reports.view";
    } else {
      // Individual Contributor / Employee
      defaults[perm.id] =
        perm.id === "employee.view" ||
        perm.id === "client.view" ||
        perm.id === "task.create" ||
        perm.id === "task.close" ||
        perm.id === "task.view_own" ||
        perm.id === "leave.apply" ||
        perm.id === "dashboard.view_personal" ||
        perm.id === "documents.download";
    }
  }

  return defaults;
}

export function hasPermission(
  userPermissions: Record<string, boolean> | undefined | null,
  permissionId: string,
): boolean {
  if (!userPermissions) return false;
  return Boolean(userPermissions[permissionId]);
}
