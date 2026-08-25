CREATE TABLE `loginInvites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`accessLevel` enum('admin','manager','operator','viewer') NOT NULL DEFAULT 'viewer',
	`entityId` int,
	`partnerId` int,
	`storeId` int,
	`invitedByUserId` int,
	`acceptedUserId` int,
	`expiresAt` datetime NOT NULL,
	`acceptedAt` datetime,
	`revokedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loginInvites_id` PRIMARY KEY(`id`),
	CONSTRAINT `login_invites_token_hash_uq` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `loginInvites` ADD CONSTRAINT `loginInvites_entityId_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `entities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loginInvites` ADD CONSTRAINT `loginInvites_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loginInvites` ADD CONSTRAINT `loginInvites_storeId_partnerStores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `partnerStores`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loginInvites` ADD CONSTRAINT `loginInvites_invitedByUserId_users_id_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loginInvites` ADD CONSTRAINT `loginInvites_acceptedUserId_users_id_fk` FOREIGN KEY (`acceptedUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `login_invites_email_idx` ON `loginInvites` (`email`);--> statement-breakpoint
CREATE INDEX `login_invites_status_idx` ON `loginInvites` (`status`);