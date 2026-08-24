CREATE TABLE `documentFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`applicationId` int NOT NULL,
	`documentType` enum('KTP','NPWP','NIB') NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`storedName` varchar(255) NOT NULL,
	`contentType` enum('application/pdf','image/jpeg','image/png') NOT NULL,
	`sizeBytes` int NOT NULL,
	`status` enum('uploaded','verified','rejected') NOT NULL DEFAULT 'uploaded',
	`uploadedBy` int NOT NULL,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documentFiles_id` PRIMARY KEY(`id`)
);
