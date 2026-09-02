-- AlterTable
ALTER TABLE `users`
    ADD COLUMN `contractNumber` VARCHAR(60) NULL,
    ADD COLUMN `country` VARCHAR(80) NULL,
    ADD COLUMN `department` VARCHAR(120) NULL,
    ADD COLUMN `municipality` VARCHAR(120) NULL;

-- CreateTable
CREATE TABLE `vendor_inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `vendor_inventory_userId_productId_key`(`userId`, `productId`),
    INDEX `vendor_inventory_companyId_userId_idx`(`companyId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `truckId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `assignedBy` INTEGER NOT NULL,
    `status` ENUM('ASIGNADO', 'DEVUELTO') NOT NULL DEFAULT 'ASIGNADO',
    `notes` VARCHAR(191) NULL,
    `assignmentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vendor_assignments_companyId_truckId_idx`(`companyId`, `truckId`),
    INDEX `vendor_assignments_companyId_userId_idx`(`companyId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_assignment_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assignmentId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `returnedQuantity` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `vendor_assignment_items_assignmentId_productId_key`(`assignmentId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vendor_inventory` ADD CONSTRAINT `vendor_inventory_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_inventory` ADD CONSTRAINT `vendor_inventory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_inventory` ADD CONSTRAINT `vendor_inventory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_assignments` ADD CONSTRAINT `vendor_assignments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_assignments` ADD CONSTRAINT `vendor_assignments_truckId_fkey` FOREIGN KEY (`truckId`) REFERENCES `trucks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_assignments` ADD CONSTRAINT `vendor_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_assignments` ADD CONSTRAINT `vendor_assignments_assignedBy_fkey` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_assignment_items` ADD CONSTRAINT `vendor_assignment_items_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `vendor_assignments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_assignment_items` ADD CONSTRAINT `vendor_assignment_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
