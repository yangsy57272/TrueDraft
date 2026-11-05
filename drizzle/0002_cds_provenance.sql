ALTER TABLE "cds_dataset" ADD COLUMN "source_page_ref" text;--> statement-breakpoint
ALTER TABLE "cds_dataset" ADD COLUMN "source_domain_exception" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cds_dataset" ADD COLUMN "source_exception_reason" text;--> statement-breakpoint
ALTER TABLE "cds_dataset" ADD COLUMN "verification_method" text;