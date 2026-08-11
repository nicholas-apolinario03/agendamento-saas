/*
  Warnings:

  - You are about to drop the column `ativa` on the `Assinatura` table. All the data in the column will be lost.
  - You are about to drop the column `plano` on the `Assinatura` table. All the data in the column will be lost.
  - You are about to drop the column `vencimento` on the `Assinatura` table. All the data in the column will be lost.
  - Added the required column `planoId` to the `Assinatura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Assinatura` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('TRIAL', 'ATIVA', 'VENCIDA', 'CANCELADA');

-- AlterTable
ALTER TABLE "Assinatura" DROP COLUMN "ativa",
DROP COLUMN "plano",
DROP COLUMN "vencimento",
ADD COLUMN     "agendamentosNoCiclo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fimCiclo" TIMESTAMP(3),
ADD COLUMN     "fimTrial" TIMESTAMP(3),
ADD COLUMN     "inicioCiclo" TIMESTAMP(3),
ADD COLUMN     "inicioTrial" TIMESTAMP(3),
ADD COLUMN     "planoId" INTEGER NOT NULL,
ADD COLUMN     "status" "StatusAssinatura" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Plano" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "limiteAgendamentos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plano_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plano_nome_key" ON "Plano"("nome");

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
