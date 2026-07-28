-- CreateTable
CREATE TABLE "SessaoWhatsApp" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "telefone" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "servicoId" INTEGER,
    "dataEscolhida" TIMESTAMP(3),
    "datahoraInicio" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessaoWhatsApp_empresaId_telefone_key" ON "SessaoWhatsApp"("empresaId", "telefone");

-- AddForeignKey
ALTER TABLE "SessaoWhatsApp" ADD CONSTRAINT "SessaoWhatsApp_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
