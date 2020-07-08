ALTER TABLE `members` CHANGE `createdOn` `createdAt` datetime NOT NULL COMMENT '';
ALTER TABLE `members` CHANGE `updatedOn` `updatedAt` datetime NOT NULL COMMENT '';
ALTER TABLE `organizations` CHANGE `createdOn` `createdAt` datetime NOT NULL COMMENT '';
ALTER TABLE `organizations` CHANGE `updatedOn` `updatedAt` datetime NOT NULL COMMENT '';
ALTER TABLE `registrations` CHANGE `registeredOn` `registeredAt` datetime NOT NULL COMMENT 'Date of the registration or renewal';
ALTER TABLE `registrations` CHANGE `deactivatedOn` `deactivatedAt` datetime NOT NULL COMMENT 'Set if the registration was canceled or deactivated during the group cycle. Keep this null at the end of the group cycle.';
ALTER TABLE `tokens` CHANGE `createdOn` `createdAt` datetime NOT NULL COMMENT '';
ALTER TABLE `users` CHANGE `createdOn` `createdAt` datetime NOT NULL COMMENT '';
ALTER TABLE `users` CHANGE `updatedOn` `updatedAt` datetime NOT NULL COMMENT '';
ALTER TABLE `groups` ADD COLUMN `createdAt` datetime NOT NULL COMMENT '';
ALTER TABLE `groups` ADD COLUMN `updatedAt` datetime NOT NULL COMMENT '';
ALTER TABLE `keychain` ADD COLUMN `createdAt` datetime NOT NULL COMMENT '';
ALTER TABLE `keychain` ADD COLUMN `updatedAt` datetime NOT NULL COMMENT '';
ALTER TABLE `tokens` ADD COLUMN `updatedAt` datetime NOT NULL COMMENT '';