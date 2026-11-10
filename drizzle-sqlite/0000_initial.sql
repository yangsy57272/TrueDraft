CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `audit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`event_type` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_event` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `brainstorm_note` (
	`id` text PRIMARY KEY NOT NULL,
	`essay_id` text NOT NULL,
	`encrypted_content` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`essay_id`) REFERENCES `essay`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `brainstorm_essay_idx` ON `brainstorm_note` (`essay_id`);--> statement-breakpoint
CREATE TABLE `cds_dataset` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`academic_year` text NOT NULL,
	`source_url` text NOT NULL,
	`source_page_ref` text,
	`source_domain_exception` integer DEFAULT false NOT NULL,
	`source_exception_reason` text,
	`data` text DEFAULT '{}' NOT NULL,
	`verification_status` text DEFAULT 'draft' NOT NULL,
	`verified_at` integer,
	`verified_by` text,
	`verification_method` text,
	`notes` text,
	`published` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`verified_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cds_school_year_uq` ON `cds_dataset` (`school_id`,`academic_year`);--> statement-breakpoint
CREATE TABLE `college_list_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`school_id` text,
	`custom_school_name` text,
	`category` text DEFAULT 'unsure' NOT NULL,
	`round` text DEFAULT 'undecided' NOT NULL,
	`platform` text,
	`deadlines` text DEFAULT '[]' NOT NULL,
	`intended_major` text,
	`status` text DEFAULT 'researching' NOT NULL,
	`encrypted_notes` text,
	`checklist` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `list_user_idx` ON `college_list_entry` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `list_user_school_uq` ON `college_list_entry` (`user_id`,`school_id`);--> statement-breakpoint
CREATE TABLE `consent_record` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`consent_type` text NOT NULL,
	`policy_version` text NOT NULL,
	`granted` integer NOT NULL,
	`timestamp` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`withdrawal_timestamp` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `consent_user_type_idx` ON `consent_record` (`user_id`,`consent_type`);--> statement-breakpoint
CREATE TABLE `essay` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`application_type` text NOT NULL,
	`prompt_text` text NOT NULL,
	`target_school` text,
	`word_limit` integer,
	`status` text DEFAULT 'drafting' NOT NULL,
	`feedback_language` text DEFAULT 'en' NOT NULL,
	`focus_areas` text DEFAULT '[]' NOT NULL,
	`list_entry_id` text,
	`encrypted_context` text,
	`encrypted_draft` text NOT NULL,
	`draft_word_count` integer DEFAULT 0 NOT NULL,
	`draft_revision` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`list_entry_id`) REFERENCES `college_list_entry`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `essay_user_idx` ON `essay` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `essay_version` (
	`id` text PRIMARY KEY NOT NULL,
	`essay_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`encrypted_content` text NOT NULL,
	`word_count` integer NOT NULL,
	`encrypted_version_note` text,
	`version_note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`essay_id`) REFERENCES `essay`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `essay_version_number_uq` ON `essay_version` (`essay_id`,`version_number`);--> statement-breakpoint
CREATE TABLE `federal_profile` (
	`school_id` text PRIMARY KEY NOT NULL,
	`unitid` text NOT NULL,
	`file_date` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feedback_run` (
	`id` text PRIMARY KEY NOT NULL,
	`essay_id` text NOT NULL,
	`essay_version_id` text,
	`kind` text NOT NULL,
	`requested_feedback_types` text DEFAULT '[]' NOT NULL,
	`feedback_language` text NOT NULL,
	`provider` text NOT NULL,
	`model_name` text NOT NULL,
	`prompt_version` text NOT NULL,
	`schema_version` text NOT NULL,
	`encrypted_request` text,
	`encrypted_structured_result` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_code` text,
	`redaction_count` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost_micro_usd` integer,
	`input_hash` text,
	`task_states` text DEFAULT '{}' NOT NULL,
	`provider_request_reference` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`essay_id`) REFERENCES `essay`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`essay_version_id`) REFERENCES `essay_version`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feedback_essay_idx` ON `feedback_run` (`essay_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `feedback_input_hash_idx` ON `feedback_run` (`essay_id`,`input_hash`);--> statement-breakpoint
CREATE TABLE `planning_run` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`feedback_language` text NOT NULL,
	`provider` text NOT NULL,
	`model_name` text NOT NULL,
	`prompt_version` text NOT NULL,
	`schema_version` text NOT NULL,
	`encrypted_structured_result` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_code` text,
	`redaction_count` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost_micro_usd` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `planning_run_user_idx` ON `planning_run` (`user_id`,`kind`,`created_at`);--> statement-breakpoint
CREATE TABLE `privacy_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`retention_preference` text DEFAULT 'until_deleted' NOT NULL,
	`optional_consents` text DEFAULT '{}' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rate_limit_bucket` (
	`key` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`key`, `window_start`)
);
--> statement-breakpoint
CREATE TABLE `resource` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`content_or_url` text NOT NULL,
	`content_type` text DEFAULT 'article' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`category` text DEFAULT 'craft' NOT NULL,
	`source` text NOT NULL,
	`author` text NOT NULL,
	`license_status` text NOT NULL,
	`permission_notes` text,
	`collection` text DEFAULT 'original' NOT NULL,
	`access` text DEFAULT 'public' NOT NULL,
	`retrieval_allowed` integer DEFAULT false NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resource_slug_unique` ON `resource` (`slug`);--> statement-breakpoint
CREATE INDEX `resource_collection_idx` ON `resource` (`collection`,`published`);--> statement-breakpoint
CREATE TABLE `school` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`name_zh` text,
	`city` text,
	`state` text,
	`country` text DEFAULT 'US' NOT NULL,
	`control` text,
	`website` text,
	`unitid` text,
	`cds_page_url` text,
	`latest_cds_year_listed` text,
	`link_checked_at` integer,
	`published` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `school_slug_unique` ON `school` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `school_unitid_unique` ON `school` (`unitid`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `student_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`encrypted_data` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`preferred_language` text DEFAULT 'en' NOT NULL,
	`feedback_language` text DEFAULT 'en' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);