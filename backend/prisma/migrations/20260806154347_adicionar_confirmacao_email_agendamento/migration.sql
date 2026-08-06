/*
  Warnings:

  - A unique constraint covering the columns `[tokenConfirmacao]` on the table `Agendamento` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "confirmadoEm" TIMESTAMP(3),
ADD COLUMN     "emailConfirmacaoEnviadoEm" TIMESTAMP(3),
ADD COLUMN     "tokenConfirmacao" TEXT,
ADD COLUMN     "tokenConfirmacaoExpiraEm" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Agendamento_tokenConfirmacao_key" ON "Agendamento"("tokenConfirmacao");
