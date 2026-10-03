CREATE TABLE `customerRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`applicationId` int NOT NULL,
	`type` enum('pembaruan_data','peninjauan_keputusan') NOT NULL,
	`message` text NOT NULL,
	`contactPhone` varchar(50),
	`status` enum('open','resolved') NOT NULL DEFAULT 'open',
	`resolutionNote` text,
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customerRequests_id` PRIMARY KEY(`id`)
);
