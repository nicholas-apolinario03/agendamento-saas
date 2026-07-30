-- CreateTable
CREATE TABLE "IntegracaoWhatsApp" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "wabaId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "numeroExibicao" TEXT,
    "conectado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegracaoWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegracaoWhatsApp_empresaId_key" ON "IntegracaoWhatsApp"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegracaoWhatsApp_wabaId_key" ON "IntegracaoWhatsApp"("wabaId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegracaoWhatsApp_phoneNumberId_key" ON "IntegracaoWhatsApp"("phoneNumberId");

-- AddForeignKey
ALTER TABLE "IntegracaoWhatsApp" ADD CONSTRAINT "IntegracaoWhatsApp_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
