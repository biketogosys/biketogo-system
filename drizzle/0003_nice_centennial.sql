CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`role` enum('admin','operator') NOT NULL DEFAULT 'operator',
	`active` boolean NOT NULL DEFAULT true,
	`lastLoginAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `bike_discount_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bikeId` int NOT NULL,
	`minDays` int NOT NULL,
	`discountPercent` decimal(5,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bike_discount_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expense_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expense_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`description` text,
	`amount` decimal(10,2) NOT NULL,
	`date` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rental_accessories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rentalId` int NOT NULL,
	`accessoryId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`dailyRate` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rental_accessories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenue_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenue_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`description` text,
	`amount` decimal(10,2) NOT NULL,
	`date` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `bikes` MODIFY COLUMN `size` varchar(50);--> statement-breakpoint
ALTER TABLE `rentals` MODIFY COLUMN `paymentMethod` enum('pix','credit_card','debit_card','cash','stripe','other');--> statement-breakpoint
ALTER TABLE `bikes` ADD `brand` varchar(100);--> statement-breakpoint
ALTER TABLE `bikes` ADD `category` enum('mtb','speed','gravel');--> statement-breakpoint
ALTER TABLE `bikes` ADD `description` text;--> statement-breakpoint
ALTER TABLE `bikes` ADD `weight` varchar(20);--> statement-breakpoint
ALTER TABLE `bikes` ADD `weightLimit` varchar(20);--> statement-breakpoint
ALTER TABLE `bikes` ADD `dailyRate` decimal(10,2);--> statement-breakpoint
ALTER TABLE `bikes` ADD `photoUrl` text;--> statement-breakpoint
ALTER TABLE `bikes` ADD `quantity` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `rentals` ADD `deliveryDate` date;--> statement-breakpoint
ALTER TABLE `rentals` ADD `deliveryTime` varchar(5);--> statement-breakpoint
ALTER TABLE `rentals` ADD `deliveryFee` decimal(10,2);--> statement-breakpoint
ALTER TABLE `rentals` ADD `discountPercent` decimal(5,2);--> statement-breakpoint
ALTER TABLE `rentals` ADD `subtotal` decimal(10,2);--> statement-breakpoint
ALTER TABLE `rentals` ADD `paymentType` enum('online','presential') DEFAULT 'presential';--> statement-breakpoint
ALTER TABLE `rentals` ADD `stripeSessionId` varchar(255);--> statement-breakpoint
ALTER TABLE `rentals` ADD `returnCondition` enum('ok','damaged');