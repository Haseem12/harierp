-- Database schema for production-related tables

--
-- Table structure for `production_batches`
-- This table can be used to store high-level information about a production run.
-- The current PHP script doesn't write to this but it's good practice to have.
--
CREATE TABLE IF NOT EXISTS `production_batches` (
  `id` varchar(255) NOT NULL,
  `batchId` varchar(255) NOT NULL,
  `productionDate` date NOT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `batchId` (`batchId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


--
-- Table structure for `raw_materials`
-- This table stores the inventory for raw materials and other store items.
-- The `stock` column will be DECREASED by the production batch script.
--
CREATE TABLE IF NOT EXISTS `raw_materials` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `sku` varchar(100) NOT NULL,
  `unitOfMeasure` varchar(50) NOT NULL,
  `litres` decimal(10,2) DEFAULT NULL,
  `stock` decimal(10,2) NOT NULL DEFAULT 0.00,
  `costPrice` decimal(10,2) NOT NULL DEFAULT 0.00,
  `lowStockThreshold` decimal(10,2) DEFAULT 10.00,
  `imageUrl` varchar(255) DEFAULT NULL,
  `supplierId` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for `products` (Finished Goods)
-- This table stores the inventory for finished goods.
-- The `stock` column will be INCREASED by the production batch script.
--
CREATE TABLE IF NOT EXISTS `products` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `costPrice` decimal(10,2) DEFAULT NULL,
  `priceTiers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`priceTiers`)),
  `productCategory` varchar(100) DEFAULT NULL,
  `alternateUnits` varchar(255) DEFAULT NULL,
  `pcsPerUnit` int(11) DEFAULT NULL,
  `unitOfMeasure` varchar(50) NOT NULL,
  `litres` decimal(10,2) DEFAULT NULL,
  `sku` varchar(100) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `lowStockThreshold` int(11) DEFAULT 10,
  `imageUrl` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


--
-- Table structure for `raw_material_usage_logs`
-- A log entry will be created here for each raw material consumed in the batch.
--
CREATE TABLE IF NOT EXISTS `raw_material_usage_logs` (
  `id` varchar(255) NOT NULL,
  `usageNumber` varchar(255) NOT NULL,
  `rawMaterialId` varchar(255) NOT NULL,
  `rawMaterialName` varchar(255) NOT NULL,
  `quantityUsed` decimal(10,2) NOT NULL,
  `unitOfMeasure` varchar(50) NOT NULL,
  `department` varchar(100) NOT NULL,
  `usageDate` date NOT NULL,
  `notes` text DEFAULT NULL,
  `recordedBy` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `rawMaterialId` (`rawMaterialId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for `product_stock_adjustment_logs`
-- A log entry will be created here for each finished good produced in the batch.
--
CREATE TABLE IF NOT EXISTS `product_stock_adjustment_logs` (
  `id` varchar(255) NOT NULL,
  `logNumber` varchar(255) NOT NULL,
  `productId` varchar(255) NOT NULL,
  `productName` varchar(255) NOT NULL,
  `quantityAdjusted` int(11) NOT NULL,
  `adjustmentType` varchar(100) NOT NULL,
  `adjustmentDate` datetime NOT NULL,
  `notes` text DEFAULT NULL,
  `previousStock` int(11) NOT NULL,
  `newStock` int(11) NOT NULL,
  `recordedBy` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `productId` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

