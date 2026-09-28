CREATE TABLE `body_weight_logs` (
	`client_uuid` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`logged_on` text NOT NULL,
	`weight_kg` real NOT NULL,
	`synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `body_weight_logs_user_id_logged_on_unique` ON `body_weight_logs` (`user_id`,`logged_on`);