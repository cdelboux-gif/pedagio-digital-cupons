CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`actorEmail` varchar(320),
	`action` enum('create','update','status_change','delete','revoke','activate','resend','simulate') NOT NULL,
	`resourceType` enum('access','login_invite','entity','partner','store','coupon','integration','email_sender','email_template','email_rule','email_outbox') NOT NULL,
	`resourceId` int,
	`resourceLabel` varchar(240),
	`beforeJson` text,
	`afterJson` text,
	`scopeJson` text,
	`requestId` varchar(120),
	`ipAddress` varchar(64),
	`userAgent` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailOutbox` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idempotencyKey` varchar(180) NOT NULL,
	`templateId` int,
	`ruleId` int,
	`eventName` varchar(120) NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(160),
	`variablesJson` text NOT NULL,
	`renderedSubject` varchar(240) NOT NULL,
	`renderedHtml` text NOT NULL,
	`renderedText` text,
	`status` enum('queued','simulated','failed','cancelled') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`lastError` text,
	`availableAt` datetime NOT NULL,
	`processedAt` datetime,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailOutbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `emailOutbox_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `emailRules` (
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
	CONSTRAINT `emailRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailSenders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`fromName` varchar(160) NOT NULL,
	`fromEmail` varchar(320) NOT NULL,
	`replyTo` varchar(320),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailSenders_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_senders_from_email_uq` UNIQUE(`fromEmail`)
);
--> statement-breakpoint
CREATE TABLE `emailTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`name` varchar(160) NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`senderId` int,
	`subject` varchar(240) NOT NULL,
	`preheader` varchar(240),
	`bodyHtml` text NOT NULL,
	`bodyText` text,
	`allowedVariablesJson` text NOT NULL,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailTemplates_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_templates_key_version_uq` UNIQUE(`templateKey`,`version`)
);
--> statement-breakpoint
ALTER TABLE `auditLogs` ADD CONSTRAINT `auditLogs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emailOutbox` ADD CONSTRAINT `emailOutbox_templateId_emailTemplates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `emailTemplates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emailOutbox` ADD CONSTRAINT `emailOutbox_ruleId_emailRules_id_fk` FOREIGN KEY (`ruleId`) REFERENCES `emailRules`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emailOutbox` ADD CONSTRAINT `emailOutbox_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emailRules` ADD CONSTRAINT `emailRules_templateId_emailTemplates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `emailTemplates`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emailRules` ADD CONSTRAINT `emailRules_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emailSenders` ADD CONSTRAINT `emailSenders_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD CONSTRAINT `emailTemplates_senderId_emailSenders_id_fk` FOREIGN KEY (`senderId`) REFERENCES `emailSenders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD CONSTRAINT `emailTemplates_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `auditLogs` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `audit_logs_resource_idx` ON `auditLogs` (`resourceType`,`resourceId`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `auditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `email_outbox_status_idx` ON `emailOutbox` (`status`,`availableAt`);--> statement-breakpoint
CREATE INDEX `email_outbox_event_idx` ON `emailOutbox` (`eventName`);--> statement-breakpoint
CREATE INDEX `email_rules_event_idx` ON `emailRules` (`eventName`);--> statement-breakpoint
CREATE INDEX `email_rules_template_idx` ON `emailRules` (`templateId`);--> statement-breakpoint
CREATE INDEX `email_templates_status_idx` ON `emailTemplates` (`status`);