CREATE TABLE `recommendationInteractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idempotencyKey` varchar(180) NOT NULL,
	`deliveryId` int NOT NULL,
	`campaignId` int NOT NULL,
	`userReference` varchar(160) NOT NULL,
	`eventName` enum('impression','click','dismiss','activate','redeem') NOT NULL,
	`costAmount` decimal(12,4),
	`eventAt` datetime NOT NULL,
	`isSimulation` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendationInteractions_id` PRIMARY KEY(`id`),
	CONSTRAINT `recommendationInteractions_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
ALTER TABLE `recommendationInteractions` ADD CONSTRAINT `recommendationInteractions_deliveryId_recommendationDeliveries_id_fk` FOREIGN KEY (`deliveryId`) REFERENCES `recommendationDeliveries`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendationInteractions` ADD CONSTRAINT `recommendationInteractions_campaignId_recommendationCampaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `recommendationCampaigns`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `recommendation_interactions_delivery_idx` ON `recommendationInteractions` (`deliveryId`,`eventName`);--> statement-breakpoint
CREATE INDEX `recommendation_interactions_campaign_idx` ON `recommendationInteractions` (`campaignId`,`eventName`,`eventAt`);--> statement-breakpoint
CREATE INDEX `recommendation_interactions_user_idx` ON `recommendationInteractions` (`userReference`,`eventAt`);