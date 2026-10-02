CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `auth_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`totp_secret` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_users_email_unique` ON `auth_users` (`email`);--> statement-breakpoint
CREATE INDEX `auth_users_email_idx` ON `auth_users` (`email`);--> statement-breakpoint
CREATE TABLE `customer_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`merchant_id` text NOT NULL,
	`fidelity_points` integer DEFAULT 0 NOT NULL,
	`lifetime_points` integer DEFAULT 0 NOT NULL,
	`last_visit_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_fidelity_points" CHECK("customer_cards"."fidelity_points" >= 0),
	CONSTRAINT "chk_lifetime_points" CHECK("customer_cards"."lifetime_points" >= 0)
);
--> statement-breakpoint
CREATE INDEX `card_customer_idx` ON `customer_cards` (`customer_id`);--> statement-breakpoint
CREATE INDEX `card_merchant_idx` ON `customer_cards` (`merchant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `card_customer_merchant_unq` ON `customer_cards` (`customer_id`,`merchant_id`);--> statement-breakpoint
CREATE TABLE `jwks` (
	`id` text PRIMARY KEY NOT NULL,
	`key_id` text,
	`public_key` text NOT NULL,
	`private_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `merchant_staff` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'business' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `staff_merchant_idx` ON `merchant_staff` (`merchant_id`);--> statement-breakpoint
CREATE INDEX `staff_user_idx` ON `merchant_staff` (`user_id`);--> statement-breakpoint
CREATE TABLE `merchant_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`merchant_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `msub_user_idx` ON `merchant_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `msub_merchant_idx` ON `merchant_subscriptions` (`merchant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `msub_user_merchant_unq` ON `merchant_subscriptions` (`user_id`,`merchant_id`);--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo_url` text,
	`stamps_per_reward` integer DEFAULT 10 NOT NULL,
	`plan_tier` text DEFAULT 'starter' NOT NULL,
	`points_balance` integer DEFAULT 0 NOT NULL,
	`points_funded` integer DEFAULT 0 NOT NULL,
	`secret_hmac_key` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchants_slug_unique` ON `merchants` (`slug`);--> statement-breakpoint
CREATE INDEX `merchants_owner_idx` ON `merchants` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `merchants_slug_idx` ON `merchants` (`slug`);--> statement-breakpoint
CREATE TABLE `rate_limit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`ip_address` text NOT NULL,
	`reason` text NOT NULL,
	`triggered_at` text,
	`is_resolved` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rl_ip_idx` ON `rate_limit_log` (`ip_address`);--> statement-breakpoint
CREATE INDEX `rl_triggered_at_idx` ON `rate_limit_log` (`triggered_at`);--> statement-breakpoint
CREATE TABLE `rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`stamps_cost` integer DEFAULT 10 NOT NULL,
	`image_url` text,
	`is_available` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rewards_merchant_idx` ON `rewards` (`merchant_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'user',
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_token_idx` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `stamp_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`cashier_id` text NOT NULL,
	`type` text NOT NULL,
	`balance_type` text DEFAULT 'fidelity' NOT NULL,
	`reward_id` text,
	`amount` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cashier_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reward_id`) REFERENCES `rewards`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tx_merchant_idx` ON `stamp_transactions` (`merchant_id`);--> statement-breakpoint
CREATE INDEX `tx_customer_idx` ON `stamp_transactions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `tx_cashier_idx` ON `stamp_transactions` (`cashier_id`);--> statement-breakpoint
CREATE INDEX `tx_merchant_created_idx` ON `stamp_transactions` (`merchant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `used_qr_signatures` (
	`signature` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scanned_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `used_qr_exp_idx` ON `used_qr_signatures` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'client' NOT NULL,
	`first_name` text,
	`last_name` text,
	`phone` text,
	`email` text NOT NULL,
	`address` text,
	`locale` text DEFAULT 'en',
	`created_at` text,
	`last_updated` text,
	FOREIGN KEY (`id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_idx` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_role_idx` ON `user` (`role`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
