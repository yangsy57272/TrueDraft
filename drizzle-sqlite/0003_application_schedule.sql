CREATE TABLE `application_schedule` (
	`user_id` text PRIMARY KEY NOT NULL,
	`encrypted_data` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
