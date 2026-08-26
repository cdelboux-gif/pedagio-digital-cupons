CREATE TABLE `couponParticipatingStores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponId` int NOT NULL,
	`storeId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `couponParticipatingStores_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_participating_stores_uq` UNIQUE(`couponId`,`storeId`)
);
--> statement-breakpoint
CREATE TABLE `couponRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponId` int NOT NULL,
	`discountType` enum('percentage','fixed') NOT NULL,
	`discountValue` decimal(12,2) NOT NULL,
	`minimumPurchaseAmount` decimal(12,2) NOT NULL DEFAULT 0,
	`maxRedemptionsPerCustomer` int NOT NULL DEFAULT 0,
	`maxRedemptionsPerVehicle` int NOT NULL DEFAULT 0,
	`maxRedemptionsPerPlate` int NOT NULL DEFAULT 0,
	`allowedWeekdaysJson` text,
	`allowedStartTime` varchar(5),
	`allowedEndTime` varchar(5),
	`timezone` varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
	`audienceJson` text,
	`radiusMeters` int NOT NULL DEFAULT 0,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`financialLimit` decimal(12,2),
	`financialUsed` decimal(12,2) NOT NULL DEFAULT 0,
	`maxRedemptions` int NOT NULL DEFAULT 0,
	`newCustomerOnly` int NOT NULL DEFAULT 0,
	`validationMode` enum('code','qr','automatic') NOT NULL DEFAULT 'code',
	`stackingPolicy` enum('stackable','non_stackable') NOT NULL DEFAULT 'non_stackable',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `couponRules_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_rules_coupon_uq` UNIQUE(`couponId`)
);
--> statement-breakpoint
ALTER TABLE `couponParticipatingStores` ADD CONSTRAINT `couponParticipatingStores_couponId_coupons_id_fk` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `couponParticipatingStores` ADD CONSTRAINT `couponParticipatingStores_storeId_partnerStores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `partnerStores`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `couponRules` ADD CONSTRAINT `couponRules_couponId_coupons_id_fk` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `coupon_participating_stores_store_idx` ON `couponParticipatingStores` (`storeId`);--> statement-breakpoint
CREATE INDEX `coupon_rules_validation_idx` ON `couponRules` (`validationMode`);