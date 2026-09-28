CREATE TABLE `food_servings` (
	`id` text PRIMARY KEY NOT NULL,
	`food_id` text NOT NULL,
	`label` text NOT NULL,
	`grams` real NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `foods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`barcode` text,
	`kcal_per_100` real NOT NULL,
	`protein_per_100` real DEFAULT 0 NOT NULL,
	`carbs_per_100` real DEFAULT 0 NOT NULL,
	`fat_per_100` real DEFAULT 0 NOT NULL,
	`fiber_per_100` real,
	`base_unit` text DEFAULT 'g' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nutrition_entries` (
	`client_uuid` text PRIMARY KEY NOT NULL,
	`server_id` text,
	`user_id` text NOT NULL,
	`food_id` text,
	`logged_on` text NOT NULL,
	`meal` text DEFAULT 'snack' NOT NULL,
	`food_name_snapshot` text NOT NULL,
	`quantity_g` real NOT NULL,
	`serving_label` text,
	`kcal` real NOT NULL,
	`protein_g` real DEFAULT 0 NOT NULL,
	`carbs_g` real DEFAULT 0 NOT NULL,
	`fat_g` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `nutrition_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kcal` integer NOT NULL,
	`protein_g` integer NOT NULL,
	`carbs_g` integer,
	`fat_g` integer,
	`tdee_estimate` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nutrition_targets_user_id_unique` ON `nutrition_targets` (`user_id`);