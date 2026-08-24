ALTER TABLE `applications` ADD `murabahahSupplierName` enum('yes','no','tidak_relevan');--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahObject` enum('yes','no','tidak_relevan');--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahPriceKnown` enum('yes','no','tidak_relevan');--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahMarginDisclosed` enum('yes','no','tidak_relevan');--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahDownPayment` enum('yes','no','tidak_relevan');--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahWakalah` enum('yes','no','tidak_relevan');--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahDpsReviewed` enum('yes','no','tidak_relevan');--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahNotes` text;--> statement-breakpoint
ALTER TABLE `assessments` ADD `recommendedPlafon` decimal(15,2);--> statement-breakpoint
ALTER TABLE `assessments` ADD `dscrRatio` decimal(5,2);--> statement-breakpoint
ALTER TABLE `assessments` ADD `lvrRatio` decimal(5,2);