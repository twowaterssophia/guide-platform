-- Preserve interaction prompts instead of discarding them during task migration.
ALTER TABLE "TaskAction" ADD COLUMN "interactionPrompt" TEXT;

-- Exactly one target is required. PostgreSQL unique indexes allow multiple NULLs,
-- so these two indexes preserve independent action ordering for points and paths.
CREATE UNIQUE INDEX "TaskAction_pointId_sequence_key" ON "TaskAction"("pointId", "sequence");
CREATE UNIQUE INDEX "TaskAction_pathId_sequence_key" ON "TaskAction"("pathId", "sequence");

ALTER TABLE "TaskAction"
  ADD CONSTRAINT "TaskAction_exactly_one_target_check"
  CHECK (
    ("pointId" IS NOT NULL AND "pathId" IS NULL)
    OR ("pointId" IS NULL AND "pathId" IS NOT NULL)
  );
