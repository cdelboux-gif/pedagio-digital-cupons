CREATE TABLE `notificationOutbox` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idempotencyKey` varchar(180) NOT NULL,
	`templateId` int,
	`ruleId` int,
	`eventName` varchar(120) NOT NULL,
	`recipientReference` varchar(160) NOT NULL,
	`payloadJson` text NOT NULL,
	`deliveryMode` enum('simulated','app_contract','platform') NOT NULL,
	`status` enum('queued','simulated','failed','delivered','cancelled') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`lastError` text,
	`availableAt` datetime NOT NULL,
	`processedAt` datetime,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationOutbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `notificationOutbox_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userReference` varchar(160) NOT NULL,
	`channel` varchar(40) NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`consentVersion` varchar(40),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_user_channel_uq` UNIQUE(`userReference`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `notificationRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`eventName` varchar(120) NOT NULL,
	`conditionsJson` text NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`cooldownSeconds` int NOT NULL DEFAULT 0,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`name` varchar(160) NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`title` varchar(120) NOT NULL,
	`body` varchar(500) NOT NULL,
	`expandedBody` text,
	`imageUrl` varchar(700),
	`ctaLabel` varchar(60),
	`deepLink` varchar(500),
	`allowedVariablesJson` text NOT NULL,
	`deliveryMode` enum('simulated','app_contract','platform') NOT NULL DEFAULT 'simulated',
	`locale` varchar(12) NOT NULL DEFAULT 'pt-BR',
	`priority` int NOT NULL DEFAULT 0,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationTemplates_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_templates_key_version_uq` UNIQUE(`templateKey`,`version`)
);
--> statement-breakpoint
ALTER TABLE `auditLogs` MODIFY COLUMN `resourceType` enum('access','login_invite','entity','partner','store','coupon','integration','email_sender','email_template','email_rule','email_outbox','notification_template','notification_rule','notification_outbox') NOT NULL;--> statement-breakpoint
ALTER TABLE `notificationOutbox` ADD CONSTRAINT `notificationOutbox_templateId_notificationTemplates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `notificationTemplates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notificationOutbox` ADD CONSTRAINT `notificationOutbox_ruleId_notificationRules_id_fk` FOREIGN KEY (`ruleId`) REFERENCES `notificationRules`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notificationOutbox` ADD CONSTRAINT `notificationOutbox_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notificationRules` ADD CONSTRAINT `notificationRules_templateId_notificationTemplates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `notificationTemplates`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notificationRules` ADD CONSTRAINT `notificationRules_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notificationTemplates` ADD CONSTRAINT `notificationTemplates_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notification_outbox_status_idx` ON `notificationOutbox` (`status`,`availableAt`);--> statement-breakpoint
CREATE INDEX `notification_outbox_event_idx` ON `notificationOutbox` (`eventName`);--> statement-breakpoint
CREATE INDEX `notification_outbox_recipient_idx` ON `notificationOutbox` (`recipientReference`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_rules_event_idx` ON `notificationRules` (`eventName`);--> statement-breakpoint
CREATE INDEX `notification_rules_template_idx` ON `notificationRules` (`templateId`);--> statement-breakpoint
CREATE INDEX `notification_templates_status_idx` ON `notificationTemplates` (`status`);