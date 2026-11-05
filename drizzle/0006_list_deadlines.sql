ALTER TABLE "college_list_entry" ADD COLUMN "deadlines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- Carry each existing single deadline over as an "application" deadline in the student's local time.
UPDATE "college_list_entry"
SET "deadlines" = jsonb_build_array(jsonb_build_object(
  'id', gen_random_uuid()::text,
  'type', 'application',
  'date', "deadline",
  'time', NULL,
  'timeZone', 'local',
  'source', NULL,
  'done', "status" IN ('submitted', 'admitted', 'waitlisted', 'denied', 'deferred', 'enrolled')
))
WHERE "deadline" IS NOT NULL AND "deadlines" = '[]'::jsonb;
