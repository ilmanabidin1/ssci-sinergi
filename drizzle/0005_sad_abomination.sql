CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
INSERT INTO `organizations` (`id`, `name`, `slug`) VALUES (1, 'SSCI Pilot', 'ssci-pilot');--> statement-breakpoint
ALTER TABLE `applications` ADD `organizationId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `assessments` ADD `organizationId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD `organizationId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int DEFAULT 1 NOT NULL;
