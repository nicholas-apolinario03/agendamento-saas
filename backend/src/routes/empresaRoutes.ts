import express from "express";
import { prisma } from "../lib/prisma";
import { auth } from "../middleware/auth";

import bcrypt from "bcrypt";
import { gerartoken } from "../service/jwt";
import { criarPlanoMercadoPago } from "../service/mercadoPago";

const empresaRoutes =
    express.Router();




empresaRoutes.get("/empresa", async (req, res) => {
    const empresas = await prisma.empresa.findMany();
    res.json(empresas);
});
empresaRoutes.post("/empresa/cadastro", async (req, res) => {
    try {
        const { nome, email, senha, telefone } = req.body;



        const empresaExistente = await prisma.empresa.findUnique({
            where: {
                email,
            },
        });

        if (empresaExistente) {
            return res.status(409).json({
                erro: "email ja cadastrado"
            });
        }
        const senhaHash = await bcrypt.hash(senha, 10);

        const planoStart = await prisma.plano.findUnique({
            where: {
                nome: "START"
            }
        });

        if (!planoStart) {
            return res.status(500).json({
                erro: "Plano inicial não encontrado"
            });
        }

        const inicioTrial = new Date();

        const fimTrial = new Date();
        fimTrial.setDate(fimTrial.getDate() + 30);

        const empresa = await prisma.$transaction(async (tx) => {

            const novaEmpresa = await tx.empresa.create({
                data: {
                    nome,
                    email,
                    senhaHash,
                    telefone
                }
            });

            await tx.assinatura.create({
                data: {
                    empresaId: novaEmpresa.id,
                    planoId: planoStart.id,
                    status: "TRIAL",
                    inicioTrial,
                    fimTrial
                }
            });

            return novaEmpresa;
        });

        return res.status(201).json(empresa);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: "erro ao cadastrar empresa"
        });
    }
});
empresaRoutes.post("/empresa/login", async (req, res) => {

    try {
        const { email, senha } = req.body;
        const empresa = await prisma.empresa.findUnique({
            where: {
                email,
            },
        });
        if (!empresa) {
            return res.status(401).json({
                erro: "email ou senha invalidos",
            })
        }
        const senhaValida = await bcrypt.compare(
            senha,
            empresa.senhaHash
        );
        if (!senhaValida) {
            return res.status(401).json({
                erro: "email ou senha invalidos",
            })
        }
        const token = gerartoken(
            empresa.id,
            empresa.email
        );
        return res.status(200).json({
            mensagem: "Login realizado com sucesso",
            token
        })
    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: "erro interno",
        });
    }
});
empresaRoutes.get("/teste-auth", auth, (req, res) => {

    res.status(200).json({
        mensagem: "Você está autenticado"
    });

}
);
empresaRoutes.get("/perfil", auth, (req, res) => {

    return res.json({
        usuario: (req as any).usuario
    });

}
);
empresaRoutes.get("/empresa/acesso", auth, async (req, res) => {
    try {
        const usuario = (req as any).usuario;

        const assinatura = await prisma.assinatura.findUnique({
            where: {
                empresaId: usuario.empresaId
            }
        });

        if (!assinatura) {
            return res.status(403).json({
                acesso: false,
                motivo: "ASSINATURA_NAO_ENCONTRADA"
            });
        }

        const agora = new Date();

        if (assinatura.status === "TRIAL") {
            if (assinatura.fimTrial && agora <= assinatura.fimTrial) {
                return res.status(200).json({
                    acesso: true,
                    status: "TRIAL",
                    fimTrial: assinatura.fimTrial
                });
            }

            return res.status(403).json({
                acesso: false,
                motivo: "TRIAL_ENCERRADO"
            });
        }

        if (assinatura.status === "ATIVA") {
            if (assinatura.fimCiclo && agora <= assinatura.fimCiclo) {
                return res.status(200).json({
                    acesso: true,
                    status: "ATIVA",
                    fimCiclo: assinatura.fimCiclo
                });
            }

            return res.status(403).json({
                acesso: false,
                motivo: "ASSINATURA_VENCIDA"
            });
        }

        return res.status(403).json({
            acesso: false,
            motivo: "ASSINATURA_INATIVA"
        });

    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            erro: "Erro ao verificar acesso"
        });
    }
});

empresaRoutes.get("/planos", async (req, res) => {
    try {
        const planos = await prisma.plano.findMany({
            where: {
                ativo: true
            },
            orderBy: {
                preco: "asc"
            }
        });

        return res.status(200).json(planos);

    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            erro: "Erro ao buscar planos"
        });
    }
});
empresaRoutes.post("/assinatura/criar", auth, async (req, res) => {
    try {
        const usuario = (req as any).usuario;
        const { planoId } = req.body;

        const novoPlano = await prisma.plano.findUnique({
            where: {
                id: planoId
            }
        });

        if (!novoPlano || !novoPlano.ativo) {
            return res.status(404).json({
                erro: "Plano não encontrado"
            });
        }

        const assinatura = await prisma.assinatura.findUnique({
            where: {
                empresaId: usuario.empresaId
            },
            include: {
                plano: true
            }
        });

        if (!assinatura) {
            return res.status(404).json({
                erro: "Assinatura não encontrada"
            });
        }

        if (assinatura.status === "TRIAL") {

            if (novoPlano.nivel <= assinatura.plano.nivel) {

                await prisma.assinatura.update({
                    where: {
                        id: assinatura.id
                    },
                    data: {
                        proximoPlanoId: novoPlano.id
                    }
                });

                return res.status(200).json({
                    acao: "AGENDADO_APOS_TRIAL",
                    mensagem: "Plano escolhido para iniciar após o período de teste"
                });
            }

            return res.status(200).json({
                acao: "ESCOLHER_INICIO",
                planoId: novoPlano.id,
                mensagem: "Escolha quando deseja iniciar o novo plano"
            });
        }

        if (assinatura.status === "ATIVA") {

            if (novoPlano.nivel === assinatura.plano.nivel) {
                return res.status(409).json({
                    erro: "Este já é o seu plano atual"
                });
            }

            if (novoPlano.nivel < assinatura.plano.nivel) {

                await prisma.assinatura.update({
                    where: {
                        id: assinatura.id
                    },
                    data: {
                        proximoPlanoId: novoPlano.id
                    }
                });

                return res.status(200).json({
                    acao: "DOWNGRADE_AGENDADO",
                    mensagem: "O novo plano será aplicado no próximo ciclo"
                });
            }

            if (novoPlano.nivel > assinatura.plano.nivel) {
                return res.status(200).json({
                    acao: "UPGRADE",
                    planoId: novoPlano.id,
                    mensagem: "Upgrade disponível"
                });
            }
        }

        if (
            assinatura.status === "VENCIDA" ||
            assinatura.status === "CANCELADA"
        ) {
            return res.status(200).json({
                acao: "NOVA_ASSINATURA",
                planoId: novoPlano.id,
                mensagem: "Pode iniciar uma nova assinatura"
            });
        }

        return res.status(400).json({
            erro: "Não foi possível processar a assinatura"
        });

    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            erro: "Erro ao processar assinatura"
        });
    }
});

import { buscarPlanoMercadoPago } from "../service/mercadoPago";

empresaRoutes.post("/assinatura/checkout", auth, async (req, res) => {
    try {
        const usuario = (req as any).usuario;
        const { planoId } = req.body;

        if (!planoId || typeof planoId !== "number") {
            return res.status(400).json({
                erro: "Plano inválido"
            });
        }

        const plano = await prisma.plano.findUnique({
            where: {
                id: planoId
            }
        });

        if (!plano || !plano.ativo) {
            return res.status(404).json({
                erro: "Plano não encontrado"
            });
        }

        if (!plano.mercadoPagoPlanoId) {
            return res.status(400).json({
                erro: "Plano não configurado para pagamento"
            });
        }

        const assinatura = await prisma.assinatura.findUnique({
            where: {
                empresaId: usuario.empresaId
            }
        });

        if (!assinatura) {
            return res.status(404).json({
                erro: "Assinatura não encontrada"
            });
        }

        const planoMercadoPago =
            await buscarPlanoMercadoPago(plano.mercadoPagoPlanoId);

        if (!planoMercadoPago.init_point) {
            return res.status(500).json({
                erro: "Checkout do plano não encontrado"
            });
        }

        return res.status(200).json({
            checkoutUrl: planoMercadoPago.init_point
        });

    } catch (erro: any) {
        console.error(
            "Erro ao iniciar checkout:",
            erro.response?.data || erro.message
        );

        return res.status(500).json({
            erro: "Erro ao iniciar pagamento"
        });
    }
});

empresaRoutes.post("/webhook/mercado-pago", async (req, res) => {
    try {
        console.log("WEBHOOK MERCADO PAGO:");
        console.log(req.body);

        return res.sendStatus(200);

    } catch (erro) {
        console.error("Erro no webhook:", erro);

        return res.sendStatus(500);
    }
});
export default empresaRoutes