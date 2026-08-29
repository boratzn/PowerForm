CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name_en` text NOT NULL,
	`name_tr` text,
	`equipment` text NOT NULL,
	`tracking_type` text DEFAULT 'weight_reps' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_slug_unique` ON `exercises` (`slug`);--> statement-breakpoint
CREATE TABLE `session_exercises` (
	`client_uuid` text PRIMARY KEY NOT NULL,
	`session_client_uuid` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`session_client_uuid`) REFERENCES `workout_sessions`(`client_uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session_sets` (
	`client_uuid` text PRIMARY KEY NOT NULL,
	`session_exercise_client_uuid` text NOT NULL,
	`set_index` integer NOT NULL,
	`set_type` text DEFAULT 'normal' NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`rir` integer,
	`rpe` real,
	`duration_seconds` integer,
	`distance_m` real,
	`is_completed` integer DEFAULT true NOT NULL,
	`completed_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_exercise_client_uuid`) REFERENCES `session_exercises`(`client_uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sync_mutations` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`operation` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`client_uuid` text PRIMARY KEY NOT NULL,
	`server_id` text,
	`user_id` text NOT NULL,
	`program_id` text,
	`program_day_id` text,
	`name` text,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`bodyweight_kg` real,
	`perceived_effort` integer,
	`notes` text,
	`synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
