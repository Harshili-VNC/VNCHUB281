ALTER TABLE "people" ALTER COLUMN "department_function" SET DEFAULT 'Operations';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "legal_entity" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "sub_department" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "people" ADD CONSTRAINT "people_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "people" ADD CONSTRAINT "people_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "people" ADD CONSTRAINT "people_manager_id_people_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_people_manager_id" ON "people" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_people_department_id" ON "people" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_people_designation_id" ON "people" USING btree ("designation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_people_primary_bu" ON "people" USING btree ("primary_business_unit");--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "personal_email";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "phone_number";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "emergency_contact_name";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "emergency_contact_phone";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "emergency_contact_relation";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "date_of_birth";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "gender";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "address";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "city";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "state";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "country";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "joining_ctc";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "employment_status";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "date_of_exit";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "non_active_reason";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "non_active_other_reason_text";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "salary";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "designation_level_id";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "employee_category";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "current_active_for_planning";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "standard_monthly_capacity_hours";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "standard_project_hours";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "standard_project_activity_hours";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "standard_organisational_activity_hours";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "role_tags";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "notes_remarks";