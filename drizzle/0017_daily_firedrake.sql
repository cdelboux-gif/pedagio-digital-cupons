ALTER TABLE `recommendationDeliveries` ADD `consentVersion` varchar(40);--> statement-breakpoint
ALTER TABLE `recommendationDeliveries` ADD `disclosureJson` text;--> statement-breakpoint
ALTER TABLE `recommendationDeliveries` ADD `decisionContextJson` text;