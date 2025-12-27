-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('ROUTER', 'SWITCH', 'FIREWALL', 'SERVER', 'LOAD_BALANCER', 'STORAGE', 'PRINTER', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "OSType" AS ENUM ('WINDOWS', 'LINUX', 'UNIX', 'NETWORK_OS', 'OTHER');

-- CreateEnum
CREATE TYPE "InterfaceStatus" AS ENUM ('UP', 'DOWN', 'TESTING', 'DORMANT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AlarmSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "AlarmStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CLEARED');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "opmanagerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "type" "DeviceType" NOT NULL,
    "category" TEXT,
    "ipAddress" TEXT NOT NULL,
    "macAddress" TEXT,
    "vendor" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "osType" "OSType",
    "osVersion" TEXT,
    "location" TEXT,
    "status" "DeviceStatus" NOT NULL,
    "availability" DOUBLE PRECISION,
    "isMonitored" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceMetric" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "cpuUsage" DOUBLE PRECISION,
    "cpuLoad1m" DOUBLE PRECISION,
    "cpuLoad5m" DOUBLE PRECISION,
    "cpuLoad15m" DOUBLE PRECISION,
    "memoryUsage" DOUBLE PRECISION,
    "memoryTotal" BIGINT,
    "memoryUsed" BIGINT,
    "memoryFree" BIGINT,
    "diskUsage" DOUBLE PRECISION,
    "diskTotal" BIGINT,
    "diskUsed" BIGINT,
    "diskFree" BIGINT,
    "responseTime" DOUBLE PRECISION,
    "packetLoss" DOUBLE PRECISION,
    "uptime" BIGINT,
    "temperature" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interface" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "opmanagerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "macAddress" TEXT,
    "speed" BIGINT,
    "mtu" INTEGER,
    "ipAddress" TEXT,
    "subnetMask" TEXT,
    "status" "InterfaceStatus" NOT NULL,
    "adminStatus" "InterfaceStatus",
    "ifIndex" INTEGER,
    "isMonitored" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "Interface_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficMetric" (
    "id" TEXT NOT NULL,
    "interfaceId" TEXT NOT NULL,
    "inOctets" BIGINT NOT NULL DEFAULT 0,
    "outOctets" BIGINT NOT NULL DEFAULT 0,
    "inPackets" BIGINT NOT NULL DEFAULT 0,
    "outPackets" BIGINT NOT NULL DEFAULT 0,
    "inBandwidth" BIGINT,
    "outBandwidth" BIGINT,
    "inUtilization" DOUBLE PRECISION,
    "outUtilization" DOUBLE PRECISION,
    "inErrors" BIGINT,
    "outErrors" BIGINT,
    "inDiscards" BIGINT,
    "outDiscards" BIGINT,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alarm" (
    "id" TEXT NOT NULL,
    "opmanagerId" TEXT,
    "deviceId" TEXT NOT NULL,
    "severity" "AlarmSeverity" NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AlarmStatus" NOT NULL,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "clearedAt" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "lastOccurrence" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alarm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopologyNode" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "icon" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopologyNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopologyEdge" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT,
    "type" TEXT,
    "interfaceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopologyEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dashboard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" JSONB NOT NULL,
    "widgets" JSONB NOT NULL,
    "theme" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_opmanagerId_key" ON "Device"("opmanagerId");

-- CreateIndex
CREATE INDEX "Device_status_idx" ON "Device"("status");

-- CreateIndex
CREATE INDEX "Device_type_idx" ON "Device"("type");

-- CreateIndex
CREATE INDEX "Device_isMonitored_idx" ON "Device"("isMonitored");

-- CreateIndex
CREATE INDEX "DeviceMetric_deviceId_timestamp_idx" ON "DeviceMetric"("deviceId", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Interface_opmanagerId_key" ON "Interface"("opmanagerId");

-- CreateIndex
CREATE INDEX "Interface_deviceId_idx" ON "Interface"("deviceId");

-- CreateIndex
CREATE INDEX "Interface_status_idx" ON "Interface"("status");

-- CreateIndex
CREATE INDEX "TrafficMetric_interfaceId_timestamp_idx" ON "TrafficMetric"("interfaceId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "Alarm_deviceId_idx" ON "Alarm"("deviceId");

-- CreateIndex
CREATE INDEX "Alarm_severity_idx" ON "Alarm"("severity");

-- CreateIndex
CREATE INDEX "Alarm_status_idx" ON "Alarm"("status");

-- CreateIndex
CREATE INDEX "Alarm_occurredAt_idx" ON "Alarm"("occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "DeviceMetric" ADD CONSTRAINT "DeviceMetric_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interface" ADD CONSTRAINT "Interface_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficMetric" ADD CONSTRAINT "TrafficMetric_interfaceId_fkey" FOREIGN KEY ("interfaceId") REFERENCES "Interface"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alarm" ADD CONSTRAINT "Alarm_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopologyNode" ADD CONSTRAINT "TopologyNode_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopologyEdge" ADD CONSTRAINT "TopologyEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TopologyNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopologyEdge" ADD CONSTRAINT "TopologyEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "TopologyNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopologyEdge" ADD CONSTRAINT "TopologyEdge_interfaceId_fkey" FOREIGN KEY ("interfaceId") REFERENCES "Interface"("id") ON DELETE SET NULL ON UPDATE CASCADE;
