ALTER TABLE `clients` ADD `complement` varchar(100);--> statement-breakpoint
ALTER TABLE `clients` ADD `docFrontUrl` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `docBackUrl` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `lgpdConsent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `lgpdConsentAt` timestamp;