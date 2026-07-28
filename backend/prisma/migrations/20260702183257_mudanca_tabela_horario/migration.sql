/*
  Warnings:

  - The `horaInicio` column on the `HorarioFuncionamento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `horaFim` column on the `HorarioFuncionamento` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "HorarioFuncionamento" DROP COLUMN "horaInicio",
ADD COLUMN     "horaInicio" TIMESTAMP(3),
DROP COLUMN "horaFim",
ADD COLUMN     "horaFim" TIMESTAMP(3);
