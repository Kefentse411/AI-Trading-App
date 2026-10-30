PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
INSERT INTO `__new_verificationToken`("identifier", "token", "expires") SELECT "identifier", "token", "expires" FROM `verificationToken`;--> statement-breakpoint
DROP TABLE `verificationToken`;--> statement-breakpoint
ALTER TABLE `__new_verificationToken` RENAME TO `verificationToken`;--> statement-breakpoint
PRAGMA foreign_keys=ON;