ALTER TABLE "feedback_run" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "feedback_run" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "feedback_run" ADD COLUMN "cost_micro_usd" integer;--> statement-breakpoint
ALTER TABLE "feedback_run" ADD COLUMN "input_hash" text;--> statement-breakpoint
ALTER TABLE "planning_run" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "planning_run" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "planning_run" ADD COLUMN "cost_micro_usd" integer;