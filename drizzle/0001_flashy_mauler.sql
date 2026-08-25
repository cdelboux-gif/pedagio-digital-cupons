CREATE TABLE `couponUses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponId` int NOT NULL,
	`partnerId` int NOT NULL,
	`reference` varchar(80) NOT NULL,
	`customerReference` varchar(120),
	`notes` text,
	`usedAt` datetime NOT NULL,
	`registeredByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `couponUses_id` PRIMARY KEY(`id`),
	CONSTRAINT `couponUses_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`title` varchar(160) NOT NULL,
	`benefit` text NOT NULL,
	`terms` text,
	`status` enum('draft','active','paused','ended') NOT NULL DEFAULT 'draft',
	`startsAt` datetime NOT NULL,
	`endsAt` datetime NOT NULL,
	`usageLimit` int NOT NULL DEFAULT 0,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`legalName` varchar(200),
	`taxId` varchar(32),
	`category` varchar(80),
	`contactName` varchar(120),
	`email` varchar(320),
	`phone` varchar(32),
	`relationshipStatus` enum('prospect','active','inactive','blocked') NOT NULL DEFAULT 'prospect',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `couponUses` ADD CONSTRAINT `couponUses_couponId_coupons_id_fk` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `couponUses` ADD CONSTRAINT `couponUses_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `couponUses` ADD CONSTRAINT `couponUses_registeredByUserId_users_id_fk` FOREIGN KEY (`registeredByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `coupon_uses_coupon_idx` ON `couponUses` (`couponId`);--> statement-breakpoint
CREATE INDEX `coupon_uses_partner_idx` ON `couponUses` (`partnerId`);--> statement-breakpoint
CREATE INDEX `coupon_uses_date_idx` ON `couponUses` (`usedAt`);--> statement-breakpoint
CREATE INDEX `coupons_partner_idx` ON `coupons` (`partnerId`);--> statement-breakpoint
CREATE INDEX `coupons_status_idx` ON `coupons` (`status`);--> statement-breakpoint
CREATE INDEX `coupons_end_date_idx` ON `coupons` (`endsAt`);--> statement-breakpoint
CREATE INDEX `partners_status_idx` ON `partners` (`relationshipStatus`);