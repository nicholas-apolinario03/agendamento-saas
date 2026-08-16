/*
  Warnings:

  - A unique constraint covering the columns `[ultimoPagamentoMercadoPagoId]` on the table `Assinatura` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Assinatura" ADD COLUMN     "ultimoPagamentoMercadoPagoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_ultimoPagamentoMercadoPagoId_key" ON "Assinatura"("ultimoPagamentoMercadoPagoId");
