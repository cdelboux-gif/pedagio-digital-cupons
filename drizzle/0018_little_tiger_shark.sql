CREATE TABLE `agentFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`runId` int,
	`label` enum('helpful','not_helpful','incorrect','unsafe','escalated') NOT NULL,
	`score` int,
	`correctionRedacted` text,
	`source` varchar(40) NOT NULL,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentFeedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agentProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentKey` varchar(80) NOT NULL,
	`name` varchar(160) NOT NULL,
	`audience` enum('admin','partner','consumer','publisher','internal') NOT NULL,
	`status` enum('draft','active','paused','retired') NOT NULL DEFAULT 'draft',
	`autonomy` enum('A0','A1','A2','A3','A4') NOT NULL DEFAULT 'A0',
	`policyVersion` varchar(40) NOT NULL,
	`promptVersion` varchar(40) NOT NULL,
	`entityId` int,
	`partnerId` int,
	`storeId` int,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `agentProfiles_agentKey_unique` UNIQUE(`agentKey`)
);
--> statement-breakpoint
CREATE TABLE `agentRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idempotencyKey` varchar(180) NOT NULL,
	`agentId` int NOT NULL,
	`actorUserId` int,
	`requesterReference` varchar(160),
	`intent` varchar(120) NOT NULL,
	`status` enum('planned','awaiting_approval','running','completed','failed','cancelled') NOT NULL DEFAULT 'planned',
	`riskLevel` varchar(20) NOT NULL,
	`inputRedactedJson` text NOT NULL,
	`outputRedactedJson` text,
	`approvalUserId` int,
	`policyVersion` varchar(40) NOT NULL,
	`promptVersion` varchar(40) NOT NULL,
	`errorMessage` text,
	`startedAt` datetime,
	`completedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentRuns_id` PRIMARY KEY(`id`),
	CONSTRAINT `agentRuns_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `agentTools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`toolKey` varchar(120) NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`requiresApproval` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentTools_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_tools_agent_key_uq` UNIQUE(`agentId`,`toolKey`)
);
--> statement-breakpoint
ALTER TABLE `agentFeedback` ADD CONSTRAINT `agentFeedback_agentId_agentProfiles_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agentProfiles`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agentFeedback` ADD CONSTRAINT `agentFeedback_runId_agentRuns_id_fk` FOREIGN KEY (`runId`) REFERENCES `agentRuns`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agentFeedback` ADD CONSTRAINT `agentFeedback_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agentProfiles` ADD CONSTRAINT `agentProfiles_entityId_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `entities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agentProfiles` ADD CONSTRAINT `agentProfiles_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agentProfiles` ADD CONSTRAINT `agentProfiles_storeId_partnerStores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `partnerStores`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agentProfiles` ADD CONSTRAINT `agentProfiles_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agentRuns` ADD CONSTRAINT `agentRuns_agentId_agentProfiles_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agentProfiles`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agentRuns` ADD CONSTRAINT `agentRuns_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agentRuns` ADD CONSTRAINT `agentRuns_approvalUserId_users_id_fk` FOREIGN KEY (`approvalUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agentTools` ADD CONSTRAINT `agentTools_agentId_agentProfiles_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agentProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `agent_feedback_agent_idx` ON `agentFeedback` (`agentId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `agent_feedback_run_idx` ON `agentFeedback` (`runId`);--> statement-breakpoint
CREATE INDEX `agent_profiles_audience_idx` ON `agentProfiles` (`audience`,`status`);--> statement-breakpoint
CREATE INDEX `agent_profiles_scope_idx` ON `agentProfiles` (`entityId`,`partnerId`,`storeId`);--> statement-breakpoint
CREATE INDEX `agent_runs_agent_status_idx` ON `agentRuns` (`agentId`,`status`);--> statement-breakpoint
CREATE INDEX `agent_runs_intent_idx` ON `agentRuns` (`intent`,`createdAt`);