CREATE TABLE `partnerIntegrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`endpointUrl` varchar(500) NOT NULL,
	`allowedEvents` text NOT NULL,
	`secretHash` varchar(64) NOT NULL,
	`secretLastFour` varchar(8) NOT NULL,
	`status` enum('active','paused') NOT NULL DEFAULT 'active',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partnerIntegrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `partner_integrations_partner_endpoint_uq` UNIQUE(`partnerId`,`endpointUrl`)
);
--> statement-breakpoint
ALTER TABLE `partnerIntegrations` ADD CONSTRAINT `partnerIntegrations_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partnerIntegrations` ADD CONSTRAINT `partnerIntegrations_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `partner_integrations_partner_idx` ON `partnerIntegrations` (`partnerId`);--> statement-breakpoint
CREATE INDEX `partner_integrations_status_idx` ON `partnerIntegrations` (`status`);