CREATE TABLE `completion_events` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`task_type` text NOT NULL,
	`schedule_config` text NOT NULL,
	`category` text,
	`is_paused` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
