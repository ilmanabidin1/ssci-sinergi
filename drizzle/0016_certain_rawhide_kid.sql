ALTER TABLE `applications` ADD `financingAkad` enum('murabahah','mudharabah');--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahType` enum('muthlaqah','muqayyadah');--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahCapitalValue` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahCapitalForm` enum('uang','aset','kombinasi');--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahBusinessPurpose` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahProfitSharingMethod` enum('profit_sharing','net_revenue');--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahBankNisbah` decimal(5,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahCustomerNisbah` decimal(5,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahPbh` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahRbh` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahCollateral` enum('yes','no');--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahGuarantor` enum('yes','no');--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahTaazirToWelfare` enum('yes','no') DEFAULT 'yes';--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahSignedAt` timestamp;--> statement-breakpoint
ALTER TABLE `applications` ADD `mudharabahNotes` text;