-- =========================================================================
-- PHASE 5: RANGE PARTITIONING FOR HIGH-SCALE PRODUCTION (POSTGRESQL)
-- =========================================================================
-- Note: In highly active B2B SaaS deployments, table scans over historical logs 
-- and transaction sheets slow down queries. We establish monthly range 
-- partitions on 'createdAt' to ensure rapid, isolated query indexes.

-- -------------------------------------------------------------------------
-- 1. AUDITLOG TABLE PARTITIONING
-- -------------------------------------------------------------------------
-- Recreate AuditLog partitioned by RANGE on (createdAt)
CREATE TABLE "AuditLog_temp" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "oldState" JSONB,
  "newState" JSONB,
  "signature" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey_partitioned" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Build slices for 2026
CREATE TABLE "AuditLog_y2026m05" PARTITION OF "AuditLog_temp"
  FOR VALUES FROM ('2026-05-01 00:00:00') TO ('2026-06-01 00:00:00');

CREATE TABLE "AuditLog_y2026m06" PARTITION OF "AuditLog_temp"
  FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-07-01 00:00:00');

CREATE TABLE "AuditLog_y2026m07" PARTITION OF "AuditLog_temp"
  FOR VALUES FROM ('2026-07-01 00:00:00') TO ('2026-08-01 00:00:00');

-- Default fallback partition for overflow/safety
CREATE TABLE "AuditLog_default" PARTITION OF "AuditLog_temp" DEFAULT;

-- Transfer existing data if table exists, then replace
-- INSERT INTO "AuditLog_temp" SELECT * FROM "AuditLog";
-- DROP TABLE "AuditLog";
-- ALTER TABLE "AuditLog_temp" RENAME TO "AuditLog";

-- Maintain local indexes on partition slices
CREATE INDEX "AuditLog_tenant_idx_partitioned" ON "AuditLog_temp" ("tenantId");
CREATE INDEX "AuditLog_createdAt_idx_partitioned" ON "AuditLog_temp" ("createdAt");


-- -------------------------------------------------------------------------
-- 2. INVOICE TABLE PARTITIONING
-- -------------------------------------------------------------------------
CREATE TABLE "Invoice_temp" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "quotationId" TEXT,
  "creatorId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "issueDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "subTotal" DECIMAL(12,2) NOT NULL,
  "taxTotal" DECIMAL(12,2) NOT NULL,
  "discountTotal" DECIMAL(12,2) NOT NULL,
  "grandTotal" DECIMAL(12,2) NOT NULL,
  "balanceDue" DECIMAL(12,2) NOT NULL,
  "paymentQrCode" TEXT,
  "dynamicValues" JSONB NOT NULL,
  "metadataSchema" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey_partitioned" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

CREATE TABLE "Invoice_y2026m05" PARTITION OF "Invoice_temp"
  FOR VALUES FROM ('2026-05-01 00:00:00') TO ('2026-06-01 00:00:00');

CREATE TABLE "Invoice_y2026m06" PARTITION OF "Invoice_temp"
  FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-07-01 00:00:00');

CREATE TABLE "Invoice_default" PARTITION OF "Invoice_temp" DEFAULT;


-- -------------------------------------------------------------------------
-- 3. PURCHASEORDER TABLE PARTITIONING
-- -------------------------------------------------------------------------
CREATE TABLE "PurchaseOrder_temp" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "quotationId" TEXT,
  "poNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "subTotal" DECIMAL(12,2) NOT NULL,
  "taxTotal" DECIMAL(12,2) NOT NULL,
  "grandTotal" DECIMAL(12,2) NOT NULL,
  "deliveryTerms" TEXT,
  "dynamicValues" JSONB NOT NULL,
  "metadataSchema" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrder_pkey_partitioned" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

CREATE TABLE "PurchaseOrder_y2026m05" PARTITION OF "PurchaseOrder_temp"
  FOR VALUES FROM ('2026-05-01 00:00:00') TO ('2026-06-01 00:00:00');

CREATE TABLE "PurchaseOrder_y2026m06" PARTITION OF "PurchaseOrder_temp"
  FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-07-01 00:00:00');

CREATE TABLE "PurchaseOrder_default" PARTITION OF "PurchaseOrder_temp" DEFAULT;


-- -------------------------------------------------------------------------
-- 4. SERVICE TABLE PARTITIONING
-- -------------------------------------------------------------------------
CREATE TABLE "Service_temp" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "slaDeadline" TIMESTAMP(3) NOT NULL,
  "activities" JSONB NOT NULL,
  "dynamicValues" JSONB NOT NULL,
  "metadataSchema" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Service_pkey_partitioned" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

CREATE TABLE "Service_y2026m05" PARTITION OF "Service_temp"
  FOR VALUES FROM ('2026-05-01 00:00:00') TO ('2026-06-01 00:00:00');

CREATE TABLE "Service_y2026m06" PARTITION OF "Service_temp"
  FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-07-01 00:00:00');

CREATE TABLE "Service_default" PARTITION OF "Service_temp" DEFAULT;
