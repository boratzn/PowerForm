CREATE TABLE IF NOT EXISTS `sleep_logs` (
	`client_uuid` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`bedtime` text NOT NULL,
	`wake_time` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`quality` integer DEFAULT 3,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_sleep_logs_user_date` ON `sleep_logs` (`user_id`,`date`);
