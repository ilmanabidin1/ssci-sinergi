ALTER TABLE `users` MODIFY COLUMN `role` enum('user','maker','checker','admin') NOT NULL DEFAULT 'maker';--> statement-breakpoint
UPDATE `users` SET `role` = 'maker' WHERE `role` = 'user';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('maker','checker','admin') NOT NULL DEFAULT 'maker';--> statement-breakpoint
ALTER TABLE `applications` ADD `checkedBy` int;--> statement-breakpoint
ALTER TABLE `applications` ADD `checkedAt` timestamp;--> statement-breakpoint
ALTER TABLE `applications` ADD `decisionNotes` text;
