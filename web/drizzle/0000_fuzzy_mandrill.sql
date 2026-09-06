CREATE TABLE `theme_drafts` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `published_themes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`source_id` text NOT NULL,
	`body` text NOT NULL,
	`version` integer NOT NULL,
	`published_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_themes_published_at` ON `published_themes` (`published_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_themes_owner_source_version` ON `published_themes` (`owner_id`,`source_id`,`version`);