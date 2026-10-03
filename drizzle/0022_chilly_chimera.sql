ALTER TABLE `assessments` ADD `overrideClassification` enum('Sangat Layak','Layak','Perlu Pengawasan','Tidak Layak');--> statement-breakpoint
ALTER TABLE `assessments` ADD `overrideReason` text;--> statement-breakpoint
ALTER TABLE `assessments` ADD `overriddenBy` int;--> statement-breakpoint
ALTER TABLE `assessments` ADD `overriddenAt` timestamp;