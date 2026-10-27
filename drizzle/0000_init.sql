CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brainstorm_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"essay_id" uuid NOT NULL,
	"encrypted_content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"consent_type" text NOT NULL,
	"policy_version" text NOT NULL,
	"granted" boolean NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawal_timestamp" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "essay" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"application_type" text NOT NULL,
	"prompt_text" text NOT NULL,
	"target_school" text,
	"word_limit" integer,
	"status" text DEFAULT 'drafting' NOT NULL,
	"feedback_language" text DEFAULT 'en' NOT NULL,
	"focus_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"encrypted_context" text,
	"encrypted_draft" text NOT NULL,
	"draft_word_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "essay_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"essay_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"encrypted_content" text NOT NULL,
	"word_count" integer NOT NULL,
	"version_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"essay_id" uuid NOT NULL,
	"essay_version_id" uuid,
	"kind" text NOT NULL,
	"requested_feedback_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"feedback_language" text NOT NULL,
	"provider" text NOT NULL,
	"model_name" text NOT NULL,
	"prompt_version" text NOT NULL,
	"schema_version" text NOT NULL,
	"encrypted_request" text,
	"encrypted_structured_result" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_code" text,
	"redaction_count" integer DEFAULT 0 NOT NULL,
	"provider_request_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"retention_preference" text DEFAULT 'until_deleted' NOT NULL,
	"optional_consents" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_bucket" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_bucket_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"content_or_url" text NOT NULL,
	"content_type" text DEFAULT 'article' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"category" text DEFAULT 'craft' NOT NULL,
	"source" text NOT NULL,
	"author" text NOT NULL,
	"license_status" text NOT NULL,
	"permission_notes" text,
	"collection" text DEFAULT 'original' NOT NULL,
	"access" text DEFAULT 'public' NOT NULL,
	"retrieval_allowed" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"feedback_language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brainstorm_note" ADD CONSTRAINT "brainstorm_note_essay_id_essay_id_fk" FOREIGN KEY ("essay_id") REFERENCES "public"."essay"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_record" ADD CONSTRAINT "consent_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay" ADD CONSTRAINT "essay_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_version" ADD CONSTRAINT "essay_version_essay_id_essay_id_fk" FOREIGN KEY ("essay_id") REFERENCES "public"."essay"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_run" ADD CONSTRAINT "feedback_run_essay_id_essay_id_fk" FOREIGN KEY ("essay_id") REFERENCES "public"."essay"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_run" ADD CONSTRAINT "feedback_run_essay_version_id_essay_version_id_fk" FOREIGN KEY ("essay_version_id") REFERENCES "public"."essay_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "brainstorm_essay_idx" ON "brainstorm_note" USING btree ("essay_id");--> statement-breakpoint
CREATE INDEX "consent_user_type_idx" ON "consent_record" USING btree ("user_id","consent_type");--> statement-breakpoint
CREATE INDEX "essay_user_idx" ON "essay" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "essay_version_number_uq" ON "essay_version" USING btree ("essay_id","version_number");--> statement-breakpoint
CREATE INDEX "feedback_essay_idx" ON "feedback_run" USING btree ("essay_id","created_at");--> statement-breakpoint
CREATE INDEX "resource_collection_idx" ON "resource" USING btree ("collection","published");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");