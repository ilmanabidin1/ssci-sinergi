ALTER TABLE `applications` ADD `financingTenor` int DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `marginRate` decimal(5,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `assessments` ADD `recommendationStatus` enum('generated','rule_fallback') DEFAULT 'rule_fallback' NOT NULL;--> statement-breakpoint
ALTER TABLE `assessments` ADD `recommendationModel` varchar(100);--> statement-breakpoint
ALTER TABLE `assessments` ADD `recommendationPromptVersion` varchar(50);
