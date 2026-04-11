CREATE TABLE `bikes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serialNumber` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`size` varchar(20),
	`color` varchar(50),
	`notes` text,
	`status` enum('available','rented','maintenance') NOT NULL DEFAULT 'available',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bikes_id` PRIMARY KEY(`id`),
	CONSTRAINT `bikes_serialNumber_unique` UNIQUE(`serialNumber`)
);
--> statement-breakpoint
CREATE TABLE `client_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`type` enum('rg_front','rg_back','other') NOT NULL,
	`url` text NOT NULL,
	`cloudinaryPublicId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`cpf` varchar(14),
	`rg` varchar(20),
	`birthDate` varchar(10),
	`gender` varchar(20),
	`height` varchar(10),
	`pedalFrequency` varchar(50),
	`origin` varchar(100),
	`phone` varchar(20),
	`email` varchar(320),
	`instagram` varchar(100),
	`accommodation` varchar(255),
	`zipCode` varchar(10),
	`street` varchar(255),
	`number` varchar(20),
	`neighborhood` varchar(100),
	`city` varchar(100),
	`state` varchar(50),
	`country` varchar(50) DEFAULT 'Brasil',
	`status` enum('lead','verified','blocked') NOT NULL DEFAULT 'lead',
	`receiveEmail` boolean NOT NULL DEFAULT true,
	`blocked` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp,
	`notes` text,
	`source` enum('shopify','manual') NOT NULL DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rentals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`bikeId` int NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date,
	`returnedAt` timestamp,
	`dailyRate` decimal(10,2),
	`totalAmount` decimal(10,2),
	`depositAmount` decimal(10,2),
	`paymentMethod` enum('pix','credit_card','debit_card','cash','other'),
	`paymentStatus` enum('pending','paid','partial','refunded') NOT NULL DEFAULT 'pending',
	`status` enum('active','returned','overdue','cancelled') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rentals_id` PRIMARY KEY(`id`)
);
