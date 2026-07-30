CREATE TYPE "public"."assessment_status" AS ENUM('Pending', 'Completed', 'Passed', 'Not Passed');--> statement-breakpoint
CREATE TYPE "public"."asset_allocation_status" AS ENUM('Allocated', 'Returned', 'Lost', 'Damaged');--> statement-breakpoint
CREATE TYPE "public"."asset_condition" AS ENUM('Good', 'Usable', 'Needs Support');--> statement-breakpoint
CREATE TYPE "public"."client_change_request_status" AS ENUM('Pending', 'Applied', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."client_record_status" AS ENUM('Draft', 'Under Review', 'Approved', 'Rejected', 'Sent Back for Correction');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('Active', 'On Hold', 'Non Active');--> statement-breakpoint
CREATE TYPE "public"."client_support_level" AS ENUM('Level 1 - Priority Client', 'Level 2 - Standard Client');--> statement-breakpoint
CREATE TYPE "public"."compensation_type" AS ENUM('Joining', 'Increment', 'Revision', 'Promotion');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('Not Started', 'In Progress', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."department_function" AS ENUM('Finance', 'HR', 'Marketing', 'Operations', 'Leadership', 'Admin', 'IT / Systems');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('Contracts', 'MOMs', 'Invoices', 'Reports');--> statement-breakpoint
CREATE TYPE "public"."employee_leave_type" AS ENUM('Casual', 'Sick', 'Annual', 'Unpaid', 'Other');--> statement-breakpoint
CREATE TYPE "public"."employment_status" AS ENUM('full_time', 'part_time', 'contract', 'intern');--> statement-breakpoint
CREATE TYPE "public"."export_job_status" AS ENUM('Processing', 'Completed', 'Failed');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('Positive', 'Improvement', 'Coaching');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('Not Started', 'In Progress', 'Achieved', 'Delayed');--> statement-breakpoint
CREATE TYPE "public"."hr_document_type" AS ENUM('Aadhar Card', 'PAN Card', 'Address Proof', 'Blood Group Record', 'Appointment Letter', 'Increment Letter', 'Promotion Letter', 'HR Letter', 'Other');--> statement-breakpoint
CREATE TYPE "public"."import_export_module" AS ENUM('Client Master', 'Employee Master');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('Processing', 'Completed', 'Completed with errors', 'Failed');--> statement-breakpoint
CREATE TYPE "public"."learning_category" AS ENUM('Software Learning', 'Soft Skills Learning', 'Technical Skills Learning');--> statement-breakpoint
CREATE TYPE "public"."learning_path_status" AS ENUM('Not Started', 'In Progress', 'Completed', 'On Hold');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."person_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."pip_status" AS ENUM('Active', 'Completed', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."promotion_readiness" AS ENUM('Not Ready', 'In Progress', 'Ready');--> statement-breakpoint
CREATE TYPE "public"."recognition_type" AS ENUM('Certificate', 'Appreciation', 'Award', 'Other');--> statement-breakpoint
CREATE TYPE "public"."task_kind" AS ENUM('general', 'client_approval', 'client_correction', 'client_team_assignment', 'client_delivery_team');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analysis_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"content" text NOT NULL,
	"generated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"account_name" text NOT NULL,
	"account_code" text,
	"is_primary_account" boolean DEFAULT false NOT NULL,
	"is_in_scope" boolean DEFAULT true NOT NULL,
	"account_status" text DEFAULT 'Active',
	"account_legal_structure" text,
	"billing_entity" text,
	"currency" text,
	"tax_registration_number" text,
	"address_line1" text,
	"address_line2" text,
	"country" text,
	"state_or_region" text,
	"city" text,
	"zip_or_pin_code" text,
	"delivery_location" text,
	"industry_code" text,
	"sub_industry" text,
	"business_unit_mapping" text,
	"revenue_last_1_year" text,
	"employee_size" text,
	"website" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_change_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"field" text NOT NULL,
	"previous_value" text DEFAULT '' NOT NULL,
	"new_value" text NOT NULL,
	"effective_from" date NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"status" "client_change_request_status" DEFAULT 'Pending' NOT NULL,
	"requested_by" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"full_name" text NOT NULL,
	"designation" text,
	"phone_number" text,
	"email_id" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_history" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"action" text NOT NULL,
	"previous_value" text,
	"new_value" text,
	"remarks" text,
	"changed_by" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_software_stacks" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"category" text NOT NULL,
	"selected_software" text,
	"login_urls" text,
	"other_details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"legal_name" text,
	"short_name" text,
	"business_unit" text,
	"billing_entity" text,
	"currency" text,
	"client_support_level" "client_support_level",
	"company_phone_number" text,
	"client_phone_country_code" text,
	"status" "client_status" DEFAULT 'Active' NOT NULL,
	"client_address_line1" text,
	"client_address_line2" text,
	"client_country" text,
	"client_country_iso" text,
	"client_state_or_region" text,
	"client_city" text,
	"client_zip_or_pin" text,
	"contract_type" text,
	"contract_start" date,
	"billing_start_date" date,
	"contract_end" date,
	"contract_renewal_date" date,
	"billing_frequency" text,
	"billing_type" text,
	"one_off_duration_days" integer,
	"billing_notes" text,
	"payment_terms" text,
	"number_of_accounts" integer DEFAULT 1,
	"applicable_service_codes" text,
	"contract_copy_link" text,
	"scope_summary" text,
	"commercial_notes" text,
	"record_status" "client_record_status" DEFAULT 'Draft' NOT NULL,
	"created_by" text,
	"last_updated_by" text,
	"approved_by" text,
	"approved_at" date,
	"rejection_correction_notes" text,
	"business_unit_manager_id" text,
	"team_lead_id" text,
	"assistant_team_lead_id" text,
	"backup_business_unit_manager_id" text,
	"backup_team_lead_id" text,
	"backup_assistant_team_lead_id" text,
	"number_of_finance_analysts" integer,
	"finance_analyst_1_id" text,
	"backup_finance_analyst_1_id" text,
	"finance_analyst_2_id" text,
	"backup_finance_analyst_2_id" text,
	"finance_analyst_3_id" text,
	"backup_finance_analyst_3_id" text,
	"finance_analyst_4_id" text,
	"backup_finance_analyst_4_id" text,
	"finance_analyst_5_id" text,
	"backup_finance_analyst_5_id" text,
	"non_active_reason" text,
	"non_active_other_reason_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_name_unique" UNIQUE("name"),
	CONSTRAINT "clients_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credentials" (
	"email" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"password_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "designation_levels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rank" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "designation_levels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "designations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "designations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"stored_file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"category" "document_category" NOT NULL,
	"client_id" text,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_appraisals" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"appraisal_year" text NOT NULL,
	"appraisal_rating" text,
	"appraisal_summary" text,
	"strengths" text,
	"improvement_areas" text,
	"reviewed_by_manager" text,
	"reviewed_by_hr" text,
	"review_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"asset_type" text NOT NULL,
	"asset_name" text NOT NULL,
	"asset_serial_number" text,
	"date_allocated" date,
	"allocation_status" "asset_allocation_status" DEFAULT 'Allocated' NOT NULL,
	"return_date" date,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_attendance_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"month" text NOT NULL,
	"attendance_days_present" integer,
	"working_days" integer,
	"late_reporting_count" integer,
	"late_reporting_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_career_paths" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"current_career_path_level" text,
	"next_target_career_level" text,
	"target_timeline" text,
	"required_learning_completion" integer,
	"hr_assessment_status" "assessment_status",
	"reporting_manager_assessment_status" "assessment_status",
	"promotion_readiness_status" "promotion_readiness",
	"career_path_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_compensation_history" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"effective_date" date NOT NULL,
	"compensation_type" "compensation_type" NOT NULL,
	"previous_ctc" integer,
	"revised_ctc" integer NOT NULL,
	"increment_amount" integer,
	"increment_percent" text,
	"reason" text,
	"approved_by" text,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_courses" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"learning_category" "learning_category" NOT NULL,
	"course_name" text NOT NULL,
	"course_status" "course_status" DEFAULT 'Not Started' NOT NULL,
	"assigned_date" date,
	"completed_date" date,
	"score_or_assessment" text,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"document_type" "hr_document_type" NOT NULL,
	"document_name" text NOT NULL,
	"document_number" text,
	"file_link" text,
	"issue_date" date,
	"expiry_date" date,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_history" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"field" text NOT NULL,
	"previous_value" text DEFAULT '' NOT NULL,
	"new_value" text DEFAULT '' NOT NULL,
	"reason" text,
	"changed_by" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_kra_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"review_period" text NOT NULL,
	"goal_title" text NOT NULL,
	"goal_description" text,
	"assigned_by" text,
	"assigned_date" date,
	"target_value" text,
	"progress_percent" integer,
	"goal_status" "goal_status",
	"manager_comments" text,
	"employee_comments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_learning_paths" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"assigned_learning_path" text,
	"learning_path_assigned_date" date,
	"learning_path_status" "learning_path_status",
	"learning_completion_percent" integer,
	"learning_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_leave_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"leave_year" text NOT NULL,
	"leave_type" "employee_leave_type" NOT NULL,
	"leave_applied_days" integer,
	"leave_approved_days" integer,
	"leave_balance" integer,
	"leave_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_personal_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"personal_asset_type" text NOT NULL,
	"personal_asset_available" boolean DEFAULT false NOT NULL,
	"asset_description" text,
	"asset_condition" "asset_condition",
	"internet_available" boolean,
	"backup_power_available" boolean,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"attendance_policy" text,
	"shift_time" text,
	"grace_period_minutes" integer,
	"leave_policy" text,
	"work_from_home_policy" text,
	"travel_policy" text,
	"policy_effective_from" date,
	"policy_notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_policies_person_id_unique" UNIQUE("person_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_project_history" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"client_code" text,
	"client_name" text NOT NULL,
	"project_or_assignment_name" text,
	"project_role" text,
	"assignment_start_date" date,
	"assignment_end_date" date,
	"current_assignment" boolean DEFAULT false,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_recognitions" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"record_kind" text NOT NULL,
	"recognition_type" "recognition_type",
	"title" text,
	"description" text,
	"awarded_date" date,
	"issued_by" text,
	"feedback_date" date,
	"feedback_type" "feedback_type",
	"feedback_summary" text,
	"shared_by" text,
	"action_required" boolean,
	"follow_up_date" date,
	"pip_status" "pip_status",
	"pip_start_date" date,
	"pip_end_date" date,
	"pip_reason" text,
	"pip_goals" text,
	"pip_review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "export_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"module" text NOT NULL,
	"format" text DEFAULT 'CSV' NOT NULL,
	"status" "export_job_status" DEFAULT 'Completed' NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"module" "import_export_module" NOT NULL,
	"file_name" text NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"success_rows" integer DEFAULT 0 NOT NULL,
	"failed_rows" integer DEFAULT 0 NOT NULL,
	"status" "import_job_status" DEFAULT 'Processing' NOT NULL,
	"error_log" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"manager_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"status" "leave_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "people" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"personal_email" text,
	"phone_number" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relation" text,
	"date_of_birth" date,
	"gender" "gender",
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"department_id" text NOT NULL,
	"hire_date" date,
	"joining_ctc" integer,
	"employment_status" "employment_status" DEFAULT 'full_time' NOT NULL,
	"date_of_exit" date,
	"non_active_reason" text,
	"non_active_other_reason_text" text,
	"salary" integer,
	"department_function" "department_function" NOT NULL,
	"is_team_lead" boolean DEFAULT false NOT NULL,
	"is_business_unit_head" boolean DEFAULT false NOT NULL,
	"designation_id" text,
	"designation_level_id" text,
	"primary_business_unit" text,
	"secondary_business_unit" text,
	"manager_id" text,
	"official_work_location" text,
	"employee_category" text,
	"current_active_for_planning" boolean DEFAULT true NOT NULL,
	"standard_monthly_capacity_hours" integer,
	"standard_project_hours" integer,
	"standard_project_activity_hours" integer,
	"standard_organisational_activity_hours" integer,
	"role_tags" text,
	"notes_remarks" text,
	"status" "person_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_employee_code_unique" UNIQUE("employee_code"),
	CONSTRAINT "people_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"due_date" date NOT NULL,
	"assigner_id" text NOT NULL,
	"assignee_id" text NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"kind" "task_kind" DEFAULT 'general' NOT NULL,
	"related_client_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
