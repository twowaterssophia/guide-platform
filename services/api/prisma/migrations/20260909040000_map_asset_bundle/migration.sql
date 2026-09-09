-- Store the PCD source together with its registered PNG preview and metadata.
ALTER TABLE "MapAsset"
ADD COLUMN "pcdEncoding" TEXT,
ADD COLUMN "checksumSha256" TEXT,
ADD COLUMN "previewStorageKey" TEXT,
ADD COLUMN "previewOriginalFileName" TEXT,
ADD COLUMN "previewMediaType" TEXT,
ADD COLUMN "previewSizeBytes" INTEGER,
ADD COLUMN "previewChecksumSha256" TEXT,
ADD COLUMN "registrationMetadata" JSONB,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
