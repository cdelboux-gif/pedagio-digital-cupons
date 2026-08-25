ALTER TABLE `recommendationCampaigns` ADD `storeId` int;--> statement-breakpoint
ALTER TABLE `recommendationCampaigns` ADD CONSTRAINT `recommendationCampaigns_storeId_partnerStores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `partnerStores`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `recommendation_campaigns_store_idx` ON `recommendationCampaigns` (`storeId`);