/*
  Warnings:

  - A unique constraint covering the columns `[nivel]` on the table `Plano` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nivel` to the `Plano` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Assinatura" ADD COLUMN     "proximoPlanoId" INTEGER;

-- AlterTable
ALTER TABLE "Plano" ADD COLUMN "nivel" INTEGER;

UPDATE "Plano"
SET "nivel" = 1
WHERE "nome" = 'ESSENCIAL';

UPDATE "Plano"
SET "nivel" = 2
WHERE "nome" = 'START';

ALTER TABLE "Plano"
ALTER COLUMN "nivel" SET NOT NULL;

CREATE UNIQUE INDEX "Plano_nivel_key"
ON "Plano"("nivel");

-- CreateIndex


-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_proximoPlanoId_fkey" FOREIGN KEY ("proximoPlanoId") REFERENCES "Plano"("id") ON DELETE SET NULL ON UPDATE CASCADE;
