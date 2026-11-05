CREATE TABLE "cds_dataset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"source_url" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verification_status" text DEFAULT 'draft' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" text,
	"notes" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "college_list_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"school_id" uuid,
	"custom_school_name" text,
	"category" text DEFAULT 'unsure' NOT NULL,
	"round" text DEFAULT 'undecided' NOT NULL,
	"platform" text,
	"deadline" text,
	"intended_major" text,
	"status" text DEFAULT 'researching' NOT NULL,
	"encrypted_notes" text,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"feedback_language" text NOT NULL,
	"provider" text NOT NULL,
	"model_name" text NOT NULL,
	"prompt_version" text NOT NULL,
	"schema_version" text NOT NULL,
	"encrypted_structured_result" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_code" text,
	"redaction_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "school" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_zh" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'US' NOT NULL,
	"control" text,
	"website" text,
	"cds_page_url" text,
	"latest_cds_year_listed" text,
	"link_checked_at" timestamp with time zone,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "student_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"encrypted_data" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "essay" ADD COLUMN "list_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "cds_dataset" ADD CONSTRAINT "cds_dataset_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cds_dataset" ADD CONSTRAINT "cds_dataset_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_list_entry" ADD CONSTRAINT "college_list_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_list_entry" ADD CONSTRAINT "college_list_entry_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_run" ADD CONSTRAINT "planning_run_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cds_school_year_uq" ON "cds_dataset" USING btree ("school_id","academic_year");--> statement-breakpoint
CREATE INDEX "list_user_idx" ON "college_list_entry" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "list_user_school_uq" ON "college_list_entry" USING btree ("user_id","school_id");--> statement-breakpoint
CREATE INDEX "planning_run_user_idx" ON "planning_run" USING btree ("user_id","kind","created_at");--> statement-breakpoint
ALTER TABLE "essay" ADD CONSTRAINT "essay_list_entry_id_college_list_entry_id_fk" FOREIGN KEY ("list_entry_id") REFERENCES "public"."college_list_entry"("id") ON DELETE set null ON UPDATE no action;