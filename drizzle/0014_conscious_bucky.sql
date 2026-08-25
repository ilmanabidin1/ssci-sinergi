CREATE TABLE `surveyPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`applicationId` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`storedName` varchar(255) NOT NULL,
	`contentType` enum('image/jpeg','image/png') NOT NULL,
	`caption` varchar(255),
	`status` enum('uploaded','analyzed','failed') NOT NULL DEFAULT 'uploaded',
	`analysisResult` json,
	`analyzedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surveyPhotos_id` PRIMARY KEY(`id`)
);
