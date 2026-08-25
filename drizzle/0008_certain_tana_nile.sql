CREATE TABLE `recommendationCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`couponId` int NOT NULL,
	`tollPlazaId` int,
	`name` varchar(160) NOT NULL,
	`mode` enum('activated_benefit','personalized','sponsored') NOT NULL,
	`sponsorshipLabel` varchar(80),
	`startsAt` datetime NOT NULL,
	`endsAt` datetime NOT NULL,
	`budgetLimit` decimal(12,2),
	`bidAmount` decimal(12,4),
	`spentAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`frequencyCap` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','paused','ended') NOT NULL DEFAULT 'draft',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recommendationCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendationDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idempotencyKey` varchar(180) NOT NULL,
	`passageEventId` int NOT NULL,
	`campaignId` int NOT NULL,
	`couponId` int NOT NULL,
	`userReference` varchar(160) NOT NULL,
	`mode` enum('activated_benefit','personalized','sponsored') NOT NULL,
	`score` decimal(8,4) NOT NULL,
	`explanation` varchar(300) NOT NULL,
	`status` enum('prepared','shown','activated','redeemed','dismissed','expired') NOT NULL DEFAULT 'prepared',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recommendationDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `recommendationDeliveries_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `tollPassageEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idempotencyKey` varchar(180) NOT NULL,
	`userReference` varchar(160) NOT NULL,
	`tollPlazaId` int NOT NULL,
	`occurredAt` datetime NOT NULL,
	`accuracyMeters` int,
	`consentPersonalization` int NOT NULL DEFAULT 0,
	`source` varchar(40) NOT NULL,
	`payloadJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tollPassageEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `tollPassageEvents_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `tollPlazas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(80) NOT NULL,
	`name` varchar(160) NOT NULL,
	`highway` varchar(80),
	`direction` varchar(80),
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`radiusMeters` int NOT NULL DEFAULT 250,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tollPlazas_id` PRIMARY KEY(`id`),
	CONSTRAINT `tollPlazas_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `recommendationCampaigns` ADD CONSTRAINT `recommendationCampaigns_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendationCampaigns` ADD CONSTRAINT `recommendationCampaigns_couponId_coupons_id_fk` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendationCampaigns` ADD CONSTRAINT `recommendationCampaigns_tollPlazaId_tollPlazas_id_fk` FOREIGN KEY (`tollPlazaId`) REFERENCES `tollPlazas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendationCampaigns` ADD CONSTRAINT `recommendationCampaigns_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendationDeliveries` ADD CONSTRAINT `recommendationDeliveries_passageEventId_tollPassageEvents_id_fk` FOREIGN KEY (`passageEventId`) REFERENCES `tollPassageEvents`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendationDeliveries` ADD CONSTRAINT `recommendationDeliveries_campaignId_recommendationCampaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `recommendationCampaigns`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendationDeliveries` ADD CONSTRAINT `recommendationDeliveries_couponId_coupons_id_fk` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tollPassageEvents` ADD CONSTRAINT `tollPassageEvents_tollPlazaId_tollPlazas_id_fk` FOREIGN KEY (`tollPlazaId`) REFERENCES `tollPlazas`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `recommendation_campaigns_partner_idx` ON `recommendationCampaigns` (`partnerId`);--> statement-breakpoint
CREATE INDEX `recommendation_campaigns_coupon_idx` ON `recommendationCampaigns` (`couponId`);--> statement-breakpoint
CREATE INDEX `recommendation_campaigns_toll_idx` ON `recommendationCampaigns` (`tollPlazaId`);--> statement-breakpoint
CREATE INDEX `recommendation_campaigns_status_idx` ON `recommendationCampaigns` (`status`,`startsAt`,`endsAt`);--> statement-breakpoint
CREATE INDEX `recommendation_deliveries_event_idx` ON `recommendationDeliveries` (`passageEventId`);--> statement-breakpoint
CREATE INDEX `recommendation_deliveries_user_idx` ON `recommendationDeliveries` (`userReference`,`createdAt`);--> statement-breakpoint
CREATE INDEX `recommendation_deliveries_campaign_idx` ON `recommendationDeliveries` (`campaignId`,`status`);--> statement-breakpoint
CREATE INDEX `toll_passage_events_user_idx` ON `tollPassageEvents` (`userReference`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `toll_passage_events_toll_idx` ON `tollPassageEvents` (`tollPlazaId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `toll_plazas_status_idx` ON `tollPlazas` (`status`);