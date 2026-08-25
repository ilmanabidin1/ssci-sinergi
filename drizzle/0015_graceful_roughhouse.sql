UPDATE `applications` SET `murabahahPriceKnown` = NULL WHERE `murabahahPriceKnown` = 'tidak_relevan';--> statement-breakpoint
UPDATE `applications` SET `murabahahMarginDisclosed` = NULL WHERE `murabahahMarginDisclosed` = 'tidak_relevan';--> statement-breakpoint
UPDATE `applications` SET `murabahahDownPayment` = NULL WHERE `murabahahDownPayment` = 'tidak_relevan';--> statement-breakpoint
UPDATE `applications` SET `murabahahWakalah` = NULL WHERE `murabahahWakalah` = 'tidak_relevan';--> statement-breakpoint
UPDATE `applications` SET `murabahahDpsReviewed` = NULL WHERE `murabahahDpsReviewed` = 'tidak_relevan';--> statement-breakpoint
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
