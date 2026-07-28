-- CreateTable
CREATE TABLE "DisponibilidadeSemanalServico" (
    "id" SERIAL NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DisponibilidadeSemanalServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcecaoDisponibilidadeServico" (
    "id" SERIAL NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "disponivel" BOOLEAN NOT NULL,

    CONSTRAINT "ExcecaoDisponibilidadeServico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DisponibilidadeSemanalServico_servicoId_diaSemana_key" ON "DisponibilidadeSemanalServico"("servicoId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "ExcecaoDisponibilidadeServico_servicoId_data_key" ON "ExcecaoDisponibilidadeServico"("servicoId", "data");

-- AddForeignKey
ALTER TABLE "DisponibilidadeSemanalServico" ADD CONSTRAINT "DisponibilidadeSemanalServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcecaoDisponibilidadeServico" ADD CONSTRAINT "ExcecaoDisponibilidadeServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
