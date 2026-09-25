CREATE TABLE `instructions` (
	`id` text PRIMARY KEY NOT NULL,
	`operation` text NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL,
	`drive_id` text
);
--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`instruction_id` text NOT NULL,
	`data` text NOT NULL,
	`version` integer NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
