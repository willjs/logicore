-- CreateTable
CREATE TABLE `companies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `nit` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    UNIQUE INDEX `permissions_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `roleId` INTEGER NOT NULL,
    `permissionId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_companies` (
    `userId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `companyId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `lastname` VARCHAR(191) NULL,
    `identificationType` VARCHAR(191) NOT NULL DEFAULT 'CC',
    `identification` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customers_companyId_name_idx`(`companyId`, `name`),
    UNIQUE INDEX `customers_companyId_identification_key`(`companyId`, `identification`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `brands_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `categories_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `brandId` INTEGER NULL,
    `categoryId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `serial` VARCHAR(191) NULL,
    `salePrice` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `state` VARCHAR(191) NOT NULL DEFAULT 'ACTIVO',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `products_companyId_name_idx`(`companyId`, `name`),
    INDEX `products_companyId_serial_idx`(`companyId`, `serial`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `warehouses_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trucks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `plate` VARCHAR(191) NULL,
    `driverId` INTEGER NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trucks_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouse_inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouseId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `warehouse_inventory_warehouseId_productId_key`(`warehouseId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `truck_inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `truckId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `truck_inventory_truckId_productId_key`(`truckId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `truckId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `saleNumber` VARCHAR(191) NOT NULL,
    `saleDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `total` DECIMAL(14, 2) NOT NULL,
    `status` ENUM('PAGADO', 'ABONO', 'PENDIENTE') NOT NULL DEFAULT 'PENDIENTE',
    `paymentMethod` ENUM('EFECTIVO', 'TRANSFERENCIA') NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sales_companyId_customerId_idx`(`companyId`, `customerId`),
    UNIQUE INDEX `sales_companyId_saleNumber_key`(`companyId`, `saleNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(14, 2) NOT NULL,
    `lineTotal` DECIMAL(14, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `saleId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `method` ENUM('EFECTIVO', 'TRANSFERENCIA') NOT NULL,
    `kind` ENUM('PAGO', 'ABONO') NOT NULL DEFAULT 'PAGO',
    `received` DECIMAL(14, 2) NULL,
    `change` DECIMAL(14, 2) NULL,
    `notes` VARCHAR(191) NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payments_companyId_customerId_idx`(`companyId`, `customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `warehouseId` INTEGER NOT NULL,
    `truckId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `status` ENUM('SIN_REINTEGRO', 'PARCIAL', 'REINTEGRADO') NOT NULL DEFAULT 'SIN_REINTEGRO',
    `notes` VARCHAR(191) NULL,
    `transferDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfer_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transferId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `returnedQuantity` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `transfer_items_transferId_productId_key`(`transferId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `returns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `transferId` INTEGER NOT NULL,
    `warehouseId` INTEGER NOT NULL,
    `truckId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `notes` VARCHAR(191) NULL,
    `returnDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `return_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `returnId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `type` ENUM('ENTRADA', 'SALIDA', 'VENTA', 'TRASLADO', 'REINTEGRO', 'AJUSTE') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `originType` ENUM('WAREHOUSE', 'TRUCK') NULL,
    `originId` INTEGER NULL,
    `destinationType` ENUM('WAREHOUSE', 'TRUCK') NULL,
    `destinationId` INTEGER NULL,
    `referenceType` ENUM('SALE', 'TRANSFER', 'RETURN', 'ADJUSTMENT', 'ENTRY', 'EXIT') NULL,
    `referenceId` INTEGER NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_movements_companyId_type_createdAt_idx`(`companyId`, `type`, `createdAt`),
    INDEX `stock_movements_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `entityType` ENUM('CUSTOMER', 'SALE', 'PAYMENT') NOT NULL,
    `entityId` INTEGER NOT NULL,
    `kind` ENUM('FOTO', 'DOCUMENTO', 'EVIDENCIA', 'FIRMA') NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attachments_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_companyId_createdAt_idx`(`companyId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_companies` ADD CONSTRAINT `user_companies_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_companies` ADD CONSTRAINT `user_companies_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_companies` ADD CONSTRAINT `user_companies_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brands` ADD CONSTRAINT `brands_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trucks` ADD CONSTRAINT `trucks_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trucks` ADD CONSTRAINT `trucks_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse_inventory` ADD CONSTRAINT `warehouse_inventory_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse_inventory` ADD CONSTRAINT `warehouse_inventory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `truck_inventory` ADD CONSTRAINT `truck_inventory_truckId_fkey` FOREIGN KEY (`truckId`) REFERENCES `trucks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `truck_inventory` ADD CONSTRAINT `truck_inventory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_truckId_fkey` FOREIGN KEY (`truckId`) REFERENCES `trucks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_truckId_fkey` FOREIGN KEY (`truckId`) REFERENCES `trucks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfer_items` ADD CONSTRAINT `transfer_items_transferId_fkey` FOREIGN KEY (`transferId`) REFERENCES `transfers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfer_items` ADD CONSTRAINT `transfer_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returns` ADD CONSTRAINT `returns_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returns` ADD CONSTRAINT `returns_transferId_fkey` FOREIGN KEY (`transferId`) REFERENCES `transfers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returns` ADD CONSTRAINT `returns_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returns` ADD CONSTRAINT `returns_truckId_fkey` FOREIGN KEY (`truckId`) REFERENCES `trucks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returns` ADD CONSTRAINT `returns_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `return_items` ADD CONSTRAINT `return_items_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `returns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `return_items` ADD CONSTRAINT `return_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
