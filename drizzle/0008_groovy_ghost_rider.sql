ALTER TABLE `organizations` ADD `legalName` varchar(255) NOT NULL DEFAULT '';--> statement-breakpoint
UPDATE `organizations` SET `legalName` = `name` WHERE `legalName` = '';--> statement-breakpoint
ALTER TABLE `organizations` ADD `registrationStatus` enum('pending','active') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);
