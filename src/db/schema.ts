// Drizzle ORM schema. Run `npm run db:push` (after `docker compose up -d`) to
// create these tables in your local Postgres instance.
//
// Note: manager/assignee/assigner/department/client relationships are stored
// as plain text columns (not DB-level foreign keys). Referential integrity is
// enforced in the server functions instead (src/api/*.ts), mirroring the
// validation that used to run against localStorage. This keeps the schema
// simple and avoids self-referencing FK edge cases.

import { pgEnum, pgTable, text, timestamp, date, integer, boolean } from "drizzle-orm/pg-core";

// Employee Module spec v1.1, Section 3: Role and Organization Mapping.
export const departmentFunctionEnum = pgEnum("department_function", [
  "Finance",
  "HR",
  "Marketing",
  "Operations",
  "Leadership",
  "Admin",
  "IT / Systems",
]);
export const personStatusEnum = pgEnum("person_status", ["active", "inactive"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other", "prefer_not_to_say"]);
export const employmentStatusEnum = pgEnum("employment_status", [
  "full_time",
  "part_time",
  "contract",
  "intern",
]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done"]);
export const leaveStatusEnum = pgEnum("leave_status", ["pending", "approved", "rejected"]);
export const documentCategoryEnum = pgEnum("document_category", [
  "Contracts",
  "MOMs",
  "Invoices",
  "Reports",
]);

// --- Masters: Clients -------------------------------------------------------
export const clientStatusEnum = pgEnum("client_status", ["Active", "On Hold", "Non Active"]);
export const clientSupportLevelEnum = pgEnum("client_support_level", [
  "Level 1 - Priority Client",
  "Level 2 - Standard Client",
]);
export const clientRecordStatusEnum = pgEnum("client_record_status", [
  "Draft",
  "Under Review",
  "Approved",
  "Rejected",
  "Sent Back for Correction",
]);
export const clientChangeRequestStatusEnum = pgEnum("client_change_request_status", [
  "Pending",
  "Applied",
  "Rejected",
]);

// --- Masters: Import / Export ----------------------------------------------
export const importExportModuleEnum = pgEnum("import_export_module", [
  "Client Master",
  "Employee Master",
]);
export const importJobStatusEnum = pgEnum("import_job_status", [
  "Processing",
  "Completed",
  "Completed with errors",
  "Failed",
]);
export const exportJobStatusEnum = pgEnum("export_job_status", [
  "Processing",
  "Completed",
  "Failed",
]);

// --- Employee sub-module enums ---------------------------------------------
export const learningPathStatusEnum = pgEnum("learning_path_status", [
  "Not Started",
  "In Progress",
  "Completed",
  "On Hold",
]);
export const courseStatusEnum = pgEnum("course_status", [
  "Not Started",
  "In Progress",
  "Completed",
]);
export const learningCategoryEnum = pgEnum("learning_category", [
  "Software Learning",
  "Soft Skills Learning",
  "Technical Skills Learning",
]);
export const assessmentStatusEnum = pgEnum("assessment_status", [
  "Pending",
  "Completed",
  "Passed",
  "Not Passed",
]);
export const promotionReadinessEnum = pgEnum("promotion_readiness", [
  "Not Ready",
  "In Progress",
  "Ready",
]);
export const goalStatusEnum = pgEnum("goal_status", [
  "Not Started",
  "In Progress",
  "Achieved",
  "Delayed",
]);
export const recognitionTypeEnum = pgEnum("recognition_type", [
  "Certificate",
  "Appreciation",
  "Award",
  "Other",
]);
export const feedbackTypeEnum = pgEnum("feedback_type", ["Positive", "Improvement", "Coaching"]);
export const pipStatusEnum = pgEnum("pip_status", ["Active", "Completed", "Closed"]);
export const assetAllocationStatusEnum = pgEnum("asset_allocation_status", [
  "Allocated",
  "Returned",
  "Lost",
  "Damaged",
]);
export const assetConditionEnum = pgEnum("asset_condition", ["Good", "Usable", "Needs Support"]);
export const compensationTypeEnum = pgEnum("compensation_type", [
  "Joining",
  "Increment",
  "Revision",
  "Promotion",
]);
export const employeeLeaveTypeEnum = pgEnum("employee_leave_type", [
  "Casual",
  "Sick",
  "Annual",
  "Unpaid",
  "Other",
]);
export const hrDocumentTypeEnum = pgEnum("hr_document_type", [
  "Aadhar Card",
  "PAN Card",
  "Address Proof",
  "Blood Group Record",
  "Appointment Letter",
  "Increment Letter",
  "Promotion Letter",
  "HR Letter",
  "Other",
]);

// ---------------------------------------------------------------------------
// Core reference tables
// ---------------------------------------------------------------------------

export const departments = pgTable("departments", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const designations = pgTable("designations", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const designationLevels = pgTable("designation_levels", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  rank: integer("rank").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// People / Employee Master
// ---------------------------------------------------------------------------

export const people = pgTable("people", {
  id: text("id").primaryKey(),
  employeeCode: text("employee_code").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  // Extended identity fields (Employee Module v1.1, Section 1)
  personalEmail: text("personal_email"),
  phoneNumber: text("phone_number"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  gender: genderEnum("gender"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  departmentId: text("department_id").notNull(),
  // --- Employee Module v1.1, Section 2: Employment Details ---
  hireDate: date("hire_date", { mode: "string" }),
  joiningCtc: integer("joining_ctc"),
  employmentStatus: employmentStatusEnum("employment_status").notNull().default("full_time"),
  dateOfExit: date("date_of_exit", { mode: "string" }),
  nonActiveReason: text("non_active_reason"),
  nonActiveOtherReasonText: text("non_active_other_reason_text"),
  salary: integer("salary"),
  // --- Employee Module v1.1, Section 3: Role and Organization Mapping ---
  departmentFunction: departmentFunctionEnum("department_function").notNull(),
  isTeamLead: boolean("is_team_lead").notNull().default(false),
  isBusinessUnitHead: boolean("is_business_unit_head").notNull().default(false),
  designationId: text("designation_id"),
  designationLevelId: text("designation_level_id"),
  primaryBusinessUnit: text("primary_business_unit"),
  secondaryBusinessUnit: text("secondary_business_unit"),
  managerId: text("manager_id"),
  officialWorkLocation: text("official_work_location"),
  employeeCategory: text("employee_category"),
  currentActiveForPlanning: boolean("current_active_for_planning").notNull().default(true),
  // --- Employee Module v1.1, Section 4: Cost and Capacity Planning ---
  standardMonthlyCapacityHours: integer("standard_monthly_capacity_hours"),
  standardProjectHours: integer("standard_project_hours"),
  standardProjectActivityHours: integer("standard_project_activity_hours"),
  standardOrganisationalActivityHours: integer("standard_organisational_activity_hours"),
  // --- Employee Module v1.1, Section 5: Role Tags and Notes ---
  roleTags: text("role_tags"), // JSON array stored as text
  notesRemarks: text("notes_remarks"),
  // Account status (active/inactive) — gates login
  status: personStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const credentials = pgTable("credentials", {
  email: text("email").primaryKey(),
  personId: text("person_id").notNull(),
  passwordHash: text("password_hash").notNull(),
});

// ---------------------------------------------------------------------------
// Employee Module Sub-tables
// ---------------------------------------------------------------------------

/** Employee Module v1.1, Section 5.1: Learning Path */
export const employeeLearningPaths = pgTable("employee_learning_paths", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  assignedLearningPath: text("assigned_learning_path"),
  learningPathAssignedDate: date("learning_path_assigned_date", { mode: "string" }),
  learningPathStatus: learningPathStatusEnum("learning_path_status"),
  learningCompletionPercent: integer("learning_completion_percent"),
  learningNotes: text("learning_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 5.2: Course / Learning Category Tracking */
export const employeeCourses = pgTable("employee_courses", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  learningCategory: learningCategoryEnum("learning_category").notNull(),
  courseName: text("course_name").notNull(),
  courseStatus: courseStatusEnum("course_status").notNull().default("Not Started"),
  assignedDate: date("assigned_date", { mode: "string" }),
  completedDate: date("completed_date", { mode: "string" }),
  scoreOrAssessment: text("score_or_assessment"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 5.3: Career Path */
export const employeeCareerPaths = pgTable("employee_career_paths", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  currentCareerPathLevel: text("current_career_path_level"),
  nextTargetCareerLevel: text("next_target_career_level"),
  targetTimeline: text("target_timeline"),
  requiredLearningCompletion: integer("required_learning_completion"),
  hrAssessmentStatus: assessmentStatusEnum("hr_assessment_status"),
  reportingManagerAssessmentStatus: assessmentStatusEnum("reporting_manager_assessment_status"),
  promotionReadinessStatus: promotionReadinessEnum("promotion_readiness_status"),
  careerPathNotes: text("career_path_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 6.1: Quarterly KRA and Goals */
export const employeeKraGoals = pgTable("employee_kra_goals", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  reviewPeriod: text("review_period").notNull(),
  goalTitle: text("goal_title").notNull(),
  goalDescription: text("goal_description"),
  assignedBy: text("assigned_by"),
  assignedDate: date("assigned_date", { mode: "string" }),
  targetValue: text("target_value"),
  progressPercent: integer("progress_percent"),
  goalStatus: goalStatusEnum("goal_status"),
  managerComments: text("manager_comments"),
  employeeComments: text("employee_comments"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 6.2: Annual Performance Appraisal */
export const employeeAppraisals = pgTable("employee_appraisals", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  appraisalYear: text("appraisal_year").notNull(),
  appraisalRating: text("appraisal_rating"),
  appraisalSummary: text("appraisal_summary"),
  strengths: text("strengths"),
  improvementAreas: text("improvement_areas"),
  reviewedByManager: text("reviewed_by_manager"),
  reviewedByHr: text("reviewed_by_hr"),
  reviewDate: date("review_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 6.3: Recognition / Feedback / PIP */
export const employeeRecognitions = pgTable("employee_recognitions", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  recordKind: text("record_kind").notNull(), // "recognition" | "feedback" | "pip"
  // Recognition fields
  recognitionType: recognitionTypeEnum("recognition_type"),
  title: text("title"),
  description: text("description"),
  awardedDate: date("awarded_date", { mode: "string" }),
  issuedBy: text("issued_by"),
  // Feedback fields
  feedbackDate: date("feedback_date", { mode: "string" }),
  feedbackType: feedbackTypeEnum("feedback_type"),
  feedbackSummary: text("feedback_summary"),
  sharedBy: text("shared_by"),
  actionRequired: boolean("action_required"),
  followUpDate: date("follow_up_date", { mode: "string" }),
  // PIP fields
  pipStatus: pipStatusEnum("pip_status"),
  pipStartDate: date("pip_start_date", { mode: "string" }),
  pipEndDate: date("pip_end_date", { mode: "string" }),
  pipReason: text("pip_reason"),
  pipGoals: text("pip_goals"),
  pipReviewNotes: text("pip_review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 7.1: Company Assets Allocated */
export const employeeAssets = pgTable("employee_assets", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  assetType: text("asset_type").notNull(),
  assetName: text("asset_name").notNull(),
  assetSerialNumber: text("asset_serial_number"),
  dateAllocated: date("date_allocated", { mode: "string" }),
  allocationStatus: assetAllocationStatusEnum("allocation_status").notNull().default("Allocated"),
  returnDate: date("return_date", { mode: "string" }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 7.2: Personal Assets for Emergency WFH */
export const employeePersonalAssets = pgTable("employee_personal_assets", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  personalAssetType: text("personal_asset_type").notNull(),
  personalAssetAvailable: boolean("personal_asset_available").notNull().default(false),
  assetDescription: text("asset_description"),
  assetCondition: assetConditionEnum("asset_condition"),
  internetAvailable: boolean("internet_available"),
  backupPowerAvailable: boolean("backup_power_available"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 8: Policies Applied */
export const employeePolicies = pgTable("employee_policies", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull().unique(),
  attendancePolicy: text("attendance_policy"),
  shiftTime: text("shift_time"),
  gracePeriodMinutes: integer("grace_period_minutes"),
  leavePolicy: text("leave_policy"),
  workFromHomePolicy: text("work_from_home_policy"),
  travelPolicy: text("travel_policy"),
  policyEffectiveFrom: date("policy_effective_from", { mode: "string" }),
  policyNotes: text("policy_notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 9.1: Attendance Summary */
export const employeeAttendanceSummaries = pgTable("employee_attendance_summaries", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  month: text("month").notNull(), // e.g. "Jul 2026"
  attendanceDaysPresent: integer("attendance_days_present"),
  workingDays: integer("working_days"),
  lateReportingCount: integer("late_reporting_count"),
  lateReportingNotes: text("late_reporting_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 9.2: Leave Summary / Leave Records */
export const employeeLeaveSummaries = pgTable("employee_leave_summaries", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  leaveYear: text("leave_year").notNull(),
  leaveType: employeeLeaveTypeEnum("leave_type").notNull(),
  leaveAppliedDays: integer("leave_applied_days"),
  leaveApprovedDays: integer("leave_approved_days"),
  leaveBalance: integer("leave_balance"),
  leaveNotes: text("leave_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 10: HR Documents */
export const employeeDocuments = pgTable("employee_documents", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  documentType: hrDocumentTypeEnum("document_type").notNull(),
  documentName: text("document_name").notNull(),
  documentNumber: text("document_number"),
  fileLink: text("file_link"),
  issueDate: date("issue_date", { mode: "string" }),
  expiryDate: date("expiry_date", { mode: "string" }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 11: Project History */
export const employeeProjectHistory = pgTable("employee_project_history", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  clientCode: text("client_code"),
  clientName: text("client_name").notNull(),
  projectOrAssignmentName: text("project_or_assignment_name"),
  projectRole: text("project_role"),
  assignmentStartDate: date("assignment_start_date", { mode: "string" }),
  assignmentEndDate: date("assignment_end_date", { mode: "string" }),
  currentAssignment: boolean("current_assignment").default(false),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Employee Module v1.1, Section 12: Compensation History */
export const employeeCompensationHistory = pgTable("employee_compensation_history", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  effectiveDate: date("effective_date", { mode: "string" }).notNull(),
  compensationType: compensationTypeEnum("compensation_type").notNull(),
  previousCtc: integer("previous_ctc"),
  revisedCtc: integer("revised_ctc").notNull(),
  incrementAmount: integer("increment_amount"),
  incrementPercent: text("increment_percent"),
  reason: text("reason"),
  approvedBy: text("approved_by"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Tasks / Leave
// ---------------------------------------------------------------------------

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  assignerId: text("assigner_id").notNull(),
  assigneeId: text("assignee_id").notNull(),
  status: taskStatusEnum("status").notNull().default("todo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  managerId: text("manager_id").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  reason: text("reason").notNull().default(""),
  status: leaveStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Clients / Client Master
// ---------------------------------------------------------------------------

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  // --- Section 1: Client Identity ---
  code: text("code").unique(),
  legalName: text("legal_name"),
  shortName: text("short_name"),
  businessUnit: text("business_unit"),
  billingEntity: text("billing_entity"),
  currency: text("currency"),
  clientSupportLevel: clientSupportLevelEnum("client_support_level"),
  companyPhoneNumber: text("company_phone_number"),
  status: clientStatusEnum("status").notNull().default("Active"),
  // --- Section 2: Client Address ---
  clientAddressLine1: text("client_address_line1"),
  clientAddressLine2: text("client_address_line2"),
  clientCountry: text("client_country"),
  clientStateOrRegion: text("client_state_or_region"),
  clientCity: text("client_city"),
  clientZipOrPin: text("client_zip_or_pin"),
  // --- Section 4: Contract and Billing ---
  contractType: text("contract_type"),
  contractStart: date("contract_start", { mode: "string" }),
  billingStartDate: date("billing_start_date", { mode: "string" }),
  contractEnd: date("contract_end", { mode: "string" }),
  contractRenewalDate: date("contract_renewal_date", { mode: "string" }),
  billingFrequency: text("billing_frequency"),
  billingType: text("billing_type"),
  oneOffDurationDays: integer("one_off_duration_days"),
  billingNotes: text("billing_notes"),
  paymentTerms: text("payment_terms"),
  // --- Section 5: Client Accounts ---
  numberOfAccounts: integer("number_of_accounts").default(1),
  // --- Section 7: Commercial References ---
  applicableServiceCodes: text("applicable_service_codes"),
  contractCopyLink: text("contract_copy_link"),
  scopeSummary: text("scope_summary"),
  commercialNotes: text("commercial_notes"),
  // --- Section 8: Approval Workflow ---
  recordStatus: clientRecordStatusEnum("record_status").notNull().default("Draft"),
  createdBy: text("created_by"),
  lastUpdatedBy: text("last_updated_by"),
  approvedBy: text("approved_by"),
  approvedAt: date("approved_at", { mode: "string" }),
  rejectionCorrectionNotes: text("rejection_correction_notes"),
  // --- Section 9: Team Ownership Structure ---
  businessUnitManagerId: text("business_unit_manager_id"),
  teamLeadId: text("team_lead_id"),
  assistantTeamLeadId: text("assistant_team_lead_id"),
  backupBusinessUnitManagerId: text("backup_business_unit_manager_id"),
  backupTeamLeadId: text("backup_team_lead_id"),
  backupAssistantTeamLeadId: text("backup_assistant_team_lead_id"),
  numberOfFinanceAnalysts: integer("number_of_finance_analysts"),
  financeAnalyst1Id: text("finance_analyst_1_id"),
  backupFinanceAnalyst1Id: text("backup_finance_analyst_1_id"),
  financeAnalyst2Id: text("finance_analyst_2_id"),
  backupFinanceAnalyst2Id: text("backup_finance_analyst_2_id"),
  financeAnalyst3Id: text("finance_analyst_3_id"),
  backupFinanceAnalyst3Id: text("backup_finance_analyst_3_id"),
  financeAnalyst4Id: text("finance_analyst_4_id"),
  backupFinanceAnalyst4Id: text("backup_finance_analyst_4_id"),
  financeAnalyst5Id: text("finance_analyst_5_id"),
  backupFinanceAnalyst5Id: text("backup_finance_analyst_5_id"),
  // --- Section 11: Non Active Logic ---
  nonActiveReason: text("non_active_reason"),
  nonActiveOtherReasonText: text("non_active_other_reason_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Client Master v1.0, Section 3: Contact Information (repeating block, 1–5) */
export const clientContacts = pgTable("client_contacts", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  fullName: text("full_name").notNull(),
  designation: text("designation"),
  phoneNumber: text("phone_number"),
  emailId: text("email_id"),
  isPrimary: boolean("is_primary").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Client Master v1.0, Section 5: Client Accounts (1–10 per client) */
export const clientAccounts = pgTable("client_accounts", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  // Core identity
  accountName: text("account_name").notNull(),
  accountCode: text("account_code"),
  isPrimaryAccount: boolean("is_primary_account").notNull().default(false),
  isInScope: boolean("is_in_scope").notNull().default(true),
  accountStatus: text("account_status").default("Active"), // "Active" | "Inactive"
  // Legal & billing
  accountLegalStructure: text("account_legal_structure"),
  billingEntity: text("billing_entity"),
  currency: text("currency"),
  taxRegistrationNumber: text("tax_registration_number"), // GST / Tax Number
  // Address
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  country: text("country"),
  stateOrRegion: text("state_or_region"),
  city: text("city"),
  zipOrPinCode: text("zip_or_pin_code"),
  deliveryLocation: text("delivery_location"),
  // Industry classification
  industryCode: text("industry_code"),
  subIndustry: text("sub_industry"),
  businessUnitMapping: text("business_unit_mapping"),
  // Financial metadata
  revenueLast1Year: text("revenue_last_1_year"),
  employeeSize: text("employee_size"),
  website: text("website"),
  // Account contact
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  // Notes
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Client Master v1.0, Section 6: Client Software Stack (per-category entries) */
export const clientSoftwareStacks = pgTable("client_software_stacks", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  category: text("category").notNull(), // e.g. "Accounting Software"
  selectedSoftware: text("selected_software"), // JSON array for multi-select
  loginUrls: text("login_urls"), // JSON array of URLs
  otherDetails: text("other_details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientChangeRequests = pgTable("client_change_requests", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  field: text("field").notNull(),
  previousValue: text("previous_value").notNull().default(""),
  newValue: text("new_value").notNull(),
  effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
  reason: text("reason").notNull().default(""),
  status: clientChangeRequestStatusEnum("status").notNull().default("Pending"),
  requestedBy: text("requested_by").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

/** Audit trail of changes made to an employee (people) master record. */
export const employeeHistory = pgTable("employee_history", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  field: text("field").notNull(),
  previousValue: text("previous_value").notNull().default(""),
  newValue: text("new_value").notNull().default(""),
  reason: text("reason"),
  changedBy: text("changed_by").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Import / Export / Documents / Analysis
// ---------------------------------------------------------------------------

export const importJobs = pgTable("import_jobs", {
  id: text("id").primaryKey(),
  module: importExportModuleEnum("module").notNull(),
  fileName: text("file_name").notNull(),
  totalRows: integer("total_rows").notNull().default(0),
  successRows: integer("success_rows").notNull().default(0),
  failedRows: integer("failed_rows").notNull().default(0),
  status: importJobStatusEnum("status").notNull().default("Processing"),
  errorLog: text("error_log"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exportJobs = pgTable("export_jobs", {
  id: text("id").primaryKey(),
  module: text("module").notNull(),
  format: text("format").notNull().default("CSV"),
  status: exportJobStatusEnum("status").notNull().default("Completed"),
  rowCount: integer("row_count").notNull().default(0),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  storedFileName: text("stored_file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  category: documentCategoryEnum("category").notNull(),
  clientId: text("client_id"),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analysisReports = pgTable("analysis_reports", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  content: text("content").notNull(),
  generatedBy: text("generated_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientHistory = pgTable("client_history", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  action: text("action").notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  remarks: text("remarks"),
  changedBy: text("changed_by").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});
