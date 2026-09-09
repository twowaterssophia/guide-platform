-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TourTaskStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskActionType" AS ENUM ('SPEECH', 'SKILL', 'INTERACTION');

-- CreateEnum
CREATE TYPE "PluginAuthType" AS ENUM ('NONE', 'BEARER', 'API_KEY', 'BASIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourTask" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "personaId" TEXT,
    "status" "TourTaskStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourPoint" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "angle" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TourPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourPath" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromPointId" TEXT NOT NULL,
    "toPointId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "TourPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAction" (
    "id" TEXT NOT NULL,
    "pointId" TEXT,
    "pathId" TEXT,
    "sequence" INTEGER NOT NULL,
    "type" "TaskActionType" NOT NULL,
    "narration" TEXT,
    "skillId" TEXT,
    "skillName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "prompt" TEXT NOT NULL DEFAULT '',
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "presetSkillsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpPlugin" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "examples" TEXT NOT NULL,
    "serviceUrl" TEXT NOT NULL,
    "authType" "PluginAuthType" NOT NULL DEFAULT 'NONE',
    "encryptedConfiguration" TEXT,
    "customHeaders" JSONB,
    "tools" JSONB,
    "lastRefreshedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpPlugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaPlugin" (
    "personaId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,

    CONSTRAINT "PersonaPlugin_pkey" PRIMARY KEY ("personaId","pluginId")
);

-- CreateTable
CREATE TABLE "AgentDownload" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "tourTaskId" TEXT NOT NULL,
    "downloadedVersion" INTEGER NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentDownload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_externalId_key" ON "User"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MapAsset_ownerId_createdAt_idx" ON "MapAsset"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "TourTask_ownerId_createdAt_idx" ON "TourTask"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "TourTask_mapId_idx" ON "TourTask"("mapId");

-- CreateIndex
CREATE UNIQUE INDEX "TourPoint_taskId_sequence_key" ON "TourPoint"("taskId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "TourPath_taskId_sequence_key" ON "TourPath"("taskId", "sequence");

-- CreateIndex
CREATE INDEX "Persona_ownerId_createdAt_idx" ON "Persona"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "McpPlugin_ownerId_createdAt_idx" ON "McpPlugin"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentDownload_ownerId_deviceId_idx" ON "AgentDownload"("ownerId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentDownload_deviceId_tourTaskId_key" ON "AgentDownload"("deviceId", "tourTaskId");

-- AddForeignKey
ALTER TABLE "MapAsset" ADD CONSTRAINT "MapAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourTask" ADD CONSTRAINT "TourTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourTask" ADD CONSTRAINT "TourTask_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "MapAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourTask" ADD CONSTRAINT "TourTask_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPoint" ADD CONSTRAINT "TourPoint_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TourTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPath" ADD CONSTRAINT "TourPath_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TourTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAction" ADD CONSTRAINT "TaskAction_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "TourPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAction" ADD CONSTRAINT "TaskAction_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "TourPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpPlugin" ADD CONSTRAINT "McpPlugin_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaPlugin" ADD CONSTRAINT "PersonaPlugin_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaPlugin" ADD CONSTRAINT "PersonaPlugin_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "McpPlugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDownload" ADD CONSTRAINT "AgentDownload_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDownload" ADD CONSTRAINT "AgentDownload_tourTaskId_fkey" FOREIGN KEY ("tourTaskId") REFERENCES "TourTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
