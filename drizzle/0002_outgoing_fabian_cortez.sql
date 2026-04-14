CREATE TABLE `accessories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100),
	`serialNumber` varchar(100),
	`quantity` int NOT NULL DEFAULT 1,
	`dailyRate` decimal(10,2),
	`purchasePrice` decimal(10,2),
	`status` enum('available','rented','maintenance','lost') NOT NULL DEFAULT 'available',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accessories_id` PRIMARY KEY(`id`)
);
