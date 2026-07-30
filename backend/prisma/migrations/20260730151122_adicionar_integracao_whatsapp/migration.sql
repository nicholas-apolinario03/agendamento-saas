/*
  Warnings:

  - You are about to drop the column `accessToken` on the `IntegracaoWhatsApp` table. All the data in the column will be lost.
  - Added the required column `accessTokenCriptografado` to the `IntegracaoWhatsApp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "IntegracaoWhatsApp" DROP COLUMN "accessToken",
ADD COLUMN     "accessTokenCriptografado" TEXT NOT NULL,
ADD COLUMN     "conectadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nomeVerificado" TEXT;
