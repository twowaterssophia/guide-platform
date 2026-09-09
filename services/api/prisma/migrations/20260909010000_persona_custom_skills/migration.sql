-- CreateEnum
CREATE TYPE "SkillSource" AS ENUM ('OFFICIAL', 'CLOUD');

-- CreateTable
CREATE TABLE "PersonaCustomSkill" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "source" "SkillSource" NOT NULL,
    "instruction" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaCustomSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonaCustomSkill_personaId_skillId_key" ON "PersonaCustomSkill"("personaId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaCustomSkill_personaId_sequence_key" ON "PersonaCustomSkill"("personaId", "sequence");

-- CreateIndex
CREATE INDEX "PersonaCustomSkill_personaId_idx" ON "PersonaCustomSkill"("personaId");

-- AddForeignKey
ALTER TABLE "PersonaCustomSkill" ADD CONSTRAINT "PersonaCustomSkill_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
