ALTER TABLE `partners` ADD `addressStreet` varchar(200);--> statement-breakpoint
ALTER TABLE `partners` ADD `addressNumber` varchar(32);--> statement-breakpoint
ALTER TABLE `partners` ADD `addressComplement` varchar(120);--> statement-breakpoint
ALTER TABLE `partners` ADD `addressNeighborhood` varchar(120);--> statement-breakpoint
ALTER TABLE `partners` ADD `addressCity` varchar(120);--> statement-breakpoint
ALTER TABLE `partners` ADD `addressState` varchar(2);--> statement-breakpoint
ALTER TABLE `partners` ADD `addressPostalCode` varchar(16);--> statement-breakpoint
ALTER TABLE `partners` ADD `addressCountry` varchar(2) DEFAULT 'BR';--> statement-breakpoint
ALTER TABLE `partners` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `partners` ADD `longitude` decimal(10,7);
