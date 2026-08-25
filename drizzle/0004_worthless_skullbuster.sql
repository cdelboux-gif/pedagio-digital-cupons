CREATE TABLE `entities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`code` varchar(60) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entities_id` PRIMARY KEY(`id`),
	CONSTRAINT `entities_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `partnerStores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`code` varchar(60) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`addressStreet` varchar(200),
	`addressNumber` varchar(32),
	`addressComplement` varchar(120),
	`addressNeighborhood` varchar(120),
	`addressCity` varchar(120),
	`addressState` varchar(2),
	`addressPostalCode` varchar(16),
	`addressCountry` varchar(2) DEFAULT 'BR',
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partnerStores_id` PRIMARY KEY(`id`),
	CONSTRAINT `partner_stores_partner_code_uq` UNIQUE(`partnerId`,`code`)
);
--> statement-breakpoint
ALTER TABLE `couponUses` ADD `storeId` int;--> statement-breakpoint
ALTER TABLE `coupons` ADD `storeId` int;--> statement-breakpoint
ALTER TABLE `coupons` ADD `itemImageKey` varchar(500);--> statement-breakpoint
ALTER TABLE `coupons` ADD `itemImageUrl` varchar(700);--> statement-breakpoint
ALTER TABLE `partners` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `partners` ADD `logoKey` varchar(500);--> statement-breakpoint
ALTER TABLE `partners` ADD `logoUrl` varchar(700);--> statement-breakpoint
ALTER TABLE `users` ADD `accessLevel` enum('admin','manager','operator','viewer') DEFAULT 'viewer' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `storeId` int;--> statement-breakpoint
ALTER TABLE `partnerStores` ADD CONSTRAINT `partnerStores_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `entities_status_idx` ON `entities` (`status`);--> statement-breakpoint
CREATE INDEX `partner_stores_partner_idx` ON `partnerStores` (`partnerId`);--> statement-breakpoint
CREATE INDEX `partner_stores_status_idx` ON `partnerStores` (`status`);--> statement-breakpoint
ALTER TABLE `couponUses` ADD CONSTRAINT `couponUses_storeId_partnerStores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `partnerStores`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_storeId_partnerStores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `partnerStores`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `coupon_uses_store_idx` ON `couponUses` (`storeId`);--> statement-breakpoint
CREATE INDEX `coupons_store_idx` ON `coupons` (`storeId`);--> statement-breakpoint
ALTER TABLE `partners` ADD CONSTRAINT `partners_entityId_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `entities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_entityId_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `entities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_storeId_partnerStores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `partnerStores`(`id`) ON DELETE set null ON UPDATE no action;