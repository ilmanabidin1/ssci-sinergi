ALTER TABLE `applications` MODIFY COLUMN `financingAkad` enum('murabahah','mudharabah','qardh','multijasa');--> statement-breakpoint
ALTER TABLE `applications` ADD `multijasaAkadType` enum('ijarah','kafalah_bil_ujrah') DEFAULT 'ijarah';--> statement-breakpoint
ALTER TABLE `applications` ADD `multijasaServiceCategory` enum('pendidikan','umrah_haji','kesehatan','tenaga_kerja_renovasi','sewa_properti','lainnya');--> statement-breakpoint
ALTER TABLE `applications` ADD `multijasaServiceProvider` varchar(255);--> statement-breakpoint
ALTER TABLE `applications` ADD `multijasaSourceObject` varchar(255);--> statement-breakpoint
ALTER TABLE `applications` ADD `multijasaServiceCost` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `multijasaDownPayment` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `multijasaUjrahAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `applications` ADD `multijasaWakalah` enum('yes','no') DEFAULT 'no';--> statement-breakpoint
ALTER TABLE `applications` ADD `multijasaDpsReviewed` enum('yes','no') DEFAULT 'yes';--> statement-breakpoint
ALTER TABLE `applications` ADD `multijasaTaazirToWelfare` enum('yes','no') DEFAULT 'yes';--> statement-breakpoint
ALTER TABLE `applications` ADD `multijasaNotes` text;