/*
  Warnings:

  - A unique constraint covering the columns `[mercadoPagoAssinaturaId]` on the table `Assinatura` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mercadoPagoPlanoId]` on the table `Plano` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Assinatura" ADD COLUMN     "mercadoPagoAssinaturaId" TEXT;

-- AlterTable
ALTER TABLE "Plano" ADD COLUMN     "mercadoPagoPlanoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_mercadoPagoAssinaturaId_key" ON "Assinatura"("mercadoPagoAssinaturaId");

-- CreateIndex
CREATE UNIQUE INDEX "Plano_mercadoPagoPlanoId_key" ON "Plano"("mercadoPagoPlanoId");
