ALTER TABLE `organizations` ADD `address` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `phone` varchar(50);--> statement-breakpoint
ALTER TABLE `organizations` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `organizations` ADD `logoUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `organizations` ADD `primaryColor` varchar(20) DEFAULT '#2458d6';--> statement-breakpoint
ALTER TABLE `users` ADD `position` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(50);