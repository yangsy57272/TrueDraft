CREATE TABLE "federal_profile" (
	"school_id" uuid PRIMARY KEY NOT NULL,
	"unitid" text NOT NULL,
	"file_date" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school" ADD COLUMN "unitid" text;--> statement-breakpoint
ALTER TABLE "federal_profile" ADD CONSTRAINT "federal_profile_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school" ADD CONSTRAINT "school_unitid_unique" UNIQUE("unitid");