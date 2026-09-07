ALTER TABLE `applications` MODIFY COLUMN `financingAkad` enum('murabahah','mudharabah','qardh');--> statement-breakpoint
ALTER TABLE `documentFiles` MODIFY COLUMN `documentType` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `isRelatedParty` enum('yes','no') DEFAULT 'no';--> statement-breakpoint
ALTER TABLE `applications` ADD `relatedPartyRelation` varchar(255);--> statement-breakpoint
ALTER TABLE `applications` ADD `incomeSourceType` enum('fixed','non_fixed','joint_income') DEFAULT 'non_fixed';--> statement-breakpoint
ALTER TABLE `applications` ADD `qardhAdminFee` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `qardhPurpose` varchar(255);