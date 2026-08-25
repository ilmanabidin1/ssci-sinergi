ALTER TABLE `applications` MODIFY COLUMN `murabahahSupplierName` varchar(255);--> statement-breakpoint
ALTER TABLE `applications` MODIFY COLUMN `murabahahObject` varchar(255);--> statement-breakpoint
ALTER TABLE `applications` MODIFY COLUMN `murabahahPriceKnown` enum('yes','no');--> statement-breakpoint
ALTER TABLE `applications` MODIFY COLUMN `murabahahMarginDisclosed` enum('yes','no');--> statement-breakpoint
ALTER TABLE `applications` MODIFY COLUMN `murabahahDownPayment` enum('yes','no');--> statement-breakpoint
ALTER TABLE `applications` MODIFY COLUMN `murabahahWakalah` enum('yes','no');--> statement-breakpoint
ALTER TABLE `applications` MODIFY COLUMN `murabahahDpsReviewed` enum('yes','no');--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahType` enum('standard','ultra_mikro','personal');--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahAcquisitionPrice` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahDirectCost` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahSupplierDiscount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahDownPaymentAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahMarginAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahInvoiceNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahWakalahConfirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahQabdhVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahSignedAt` timestamp;--> statement-breakpoint
ALTER TABLE `applications` ADD `murabahahTaazirToWelfare` enum('yes','no') DEFAULT 'yes';