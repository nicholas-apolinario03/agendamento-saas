import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function criarPlanos(): Promise<void> {
await prisma.plano.upsert({
    where: {
        nome: "ESSENCIAL",
    },
    update: {
        preco: 7.90,
        limiteAgendamentos: 50,
        nivel: 1,
        ativo: true,
    },
    create: {
        nome: "ESSENCIAL",
        preco: 7.90,
        limiteAgendamentos: 50,
        nivel: 1,
        ativo: true,
    },
});

await prisma.plano.upsert({
    where: {
        nome: "START",
    },
    update: {
        preco: 19.90,
        limiteAgendamentos: 200,
        nivel: 2,
        ativo: true,
    },
    create: {
        nome: "START",
        preco: 19.90,
        limiteAgendamentos: 200,
        nivel: 2,
        ativo: true,
    },
});
  console.log("Planos cadastrados com sucesso!");
}

criarPlanos()
  .catch((erro) => {
    console.error("Erro ao cadastrar planos:", erro);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });