ALTER TABLE `applications` ADD `productSegment` enum('umkm','karyawan_swasta','guru_sertifikasi','non_perorangan') DEFAULT 'umkm';--> statement-breakpoint
UPDATE `applications` SET `productSegment` = 'karyawan_swasta' WHERE `incomeSourceType` = 'fixed';
