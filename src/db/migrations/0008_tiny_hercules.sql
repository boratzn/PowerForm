CREATE TABLE `body_measurements` (
	`client_uuid` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`logged_on` text NOT NULL,
	`neck_cm` real,
	`shoulder_cm` real,
	`chest_cm` real,
	`waist_cm` real,
	`hip_cm` real,
	`arm_left_cm` real,
	`arm_right_cm` real,
	`forearm_cm` real,
	`thigh_cm` real,
	`calf_cm` real,
	`synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `body_measurements_user_id_logged_on_unique` ON `body_measurements` (`user_id`,`logged_on`);