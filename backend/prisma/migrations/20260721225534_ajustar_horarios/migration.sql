/*
  Warnings:

  - Made the column `horaInicio` on table `HorarioFuncionamento` required. This step will fail if there are existing NULL values in that column.
  - Made the column `horaFim` on table `HorarioFuncionamento` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "HorarioFuncionamento" ALTER COLUMN "horaInicio" SET NOT NULL,
ALTER COLUMN "horaInicio" SET DATA TYPE TEXT,
ALTER COLUMN "horaFim" SET NOT NULL,
ALTER COLUMN "horaFim" SET DATA TYPE TEXT;
