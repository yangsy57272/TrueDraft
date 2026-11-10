CREATE TABLE `school_supplements` (
	`school_id` text NOT NULL,
	`cycle` text NOT NULL,
	`status` text NOT NULL,
	`source_url` text,
	`guide_url` text,
	`prompts` text DEFAULT '[]' NOT NULL,
	`list_updated` text,
	`imported_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`school_id`, `cycle`),
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE cascade
);
