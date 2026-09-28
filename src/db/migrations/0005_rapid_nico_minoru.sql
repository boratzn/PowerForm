CREATE TABLE `program_days` (
	`client_uuid` text PRIMARY KEY NOT NULL,
	`server_id` text,
	`program_client_uuid` text NOT NULL,
	`day_index` integer NOT NULL,
	`name` text NOT NULL,
	`focus` text,
	`notes` text,
	FOREIGN KEY (`program_client_uuid`) REFERENCES `programs`(`client_uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `program_exercises` (
	`client_uuid` text PRIMARY KEY NOT NULL,
	`server_id` text,
	`program_day_client_uuid` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`target_sets` integer NOT NULL,
	`rep_min` integer,
	`rep_max` integer,
	`target_rir` integer,
	`rest_seconds` integer,
	`notes` text,
	FOREIGN KEY (`program_day_client_uuid`) REFERENCES `program_days`(`client_uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`client_uuid` text PRIMARY KEY NOT NULL,
	`server_id` text,
	`user_id` text,
	`name` text NOT NULL,
	`description` text,
	`goal` text,
	`days_per_week` integer NOT NULL,
	`duration_weeks` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_template` integer DEFAULT false NOT NULL,
	`started_at` text,
	`synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
